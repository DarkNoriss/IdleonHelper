import {
  type CellTier,
  cellToPoint,
  type SortMove,
} from "./sushi-station-board";
import { SUSHI_GRID } from "./sushi-station-constants";

const buildSortMove = (
  fromCell: number,
  toCell: number,
  tier: string
): SortMove => ({
  from: cellToPoint(fromCell),
  to: cellToPoint(toCell),
  tier,
  fromRow: Math.floor(fromCell / SUSHI_GRID.COLUMNS),
  fromCol: fromCell % SUSHI_GRID.COLUMNS,
  toRow: Math.floor(toCell / SUSHI_GRID.COLUMNS),
  toCol: toCell % SUSHI_GRID.COLUMNS,
});

// A misplaced piece that sits on a slot wanting a different tier. These are
// the only cells that can take part in a cycle: every cell in a cycle is both
// a source (its piece must leave) and a target (its slot wants another tier).
type DualCell = { cell: number; want: number; have: number };

// Shortest directed cycle in the tier multigraph spanned by the remaining dual
// cells. Nodes are tier values; an edge want -> have exists when some dual cell
// wants `want` and holds `have`. Returns the tier sequence [t0, t1, ..., tk-1]
// of a minimal closed walk (t0 -> t1 -> ... -> tk-1 -> t0), or null when the
// graph is acyclic. Shortest-first keeps cycles small, which maximizes their
// count and therefore minimizes drags (drags = misplaced - cycles).
const findShortestTierCycle = (duals: DualCell[]): number[] | null => {
  const adjacency = new Map<number, Set<number>>();
  for (const dual of duals) {
    const targets = adjacency.get(dual.want);
    if (targets) {
      targets.add(dual.have);
    } else {
      adjacency.set(dual.want, new Set([dual.have]));
    }
  }

  let best: number[] | null = null;
  for (const start of adjacency.keys()) {
    const prev = new Map<number, number>();
    const queue: number[] = [start];
    const seen = new Set<number>([start]);
    while (queue.length > 0) {
      const node = queue.shift()!;
      const neighbors = adjacency.get(node);
      if (!neighbors) {
        continue;
      }
      if (neighbors.has(start)) {
        const path: number[] = [node];
        let cursor = node;
        while (cursor !== start) {
          cursor = prev.get(cursor)!;
          path.push(cursor);
        }
        path.reverse();
        if (best === null || path.length < best.length) {
          best = path;
        }
        break;
      }
      for (const neighbor of neighbors) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          prev.set(neighbor, node);
          queue.push(neighbor);
        }
      }
    }
  }
  return best;
};

// Greedily peel off the shortest tier cycle, realize it with concrete cells,
// and record each piece's target slot. Same-tier pieces are interchangeable,
// so the cell chosen for a given want -> have edge is arbitrary. Returns the
// set of cells consumed by cycles (both sources and targets) so the chain pass
// can skip them.
const assignCycles = (
  duals: DualCell[],
  pieceTarget: Map<number, number>
): Set<number> => {
  const used = new Set<number>();
  // Index dual cells by their want -> have edge for O(1) realization.
  const byEdge = new Map<string, number[]>();
  for (const dual of duals) {
    const key = `${dual.want}->${dual.have}`;
    const list = byEdge.get(key);
    if (list) {
      list.push(dual.cell);
    } else {
      byEdge.set(key, [dual.cell]);
    }
  }
  const wantOf = new Map<number, number>();
  for (const dual of duals) {
    wantOf.set(dual.cell, dual.want);
  }

  let remaining = duals;
  while (remaining.length > 0) {
    const tierCycle = findShortestTierCycle(remaining);
    if (tierCycle === null) {
      break;
    }
    const cycleCells: number[] = [];
    for (let i = 0; i < tierCycle.length; i++) {
      const want = tierCycle[i]!;
      const have = tierCycle[(i + 1) % tierCycle.length]!;
      const cell = byEdge.get(`${want}->${have}`)!.pop()!;
      cycleCells.push(cell);
      used.add(cell);
    }
    // piece(cycleCells[i]) has tier have(i) = want(i+1), so it lands on the
    // next cell's slot.
    for (let i = 0; i < cycleCells.length; i++) {
      const from = cycleCells[i]!;
      const to = cycleCells[(i + 1) % cycleCells.length]!;
      pieceTarget.set(from, to);
    }
    remaining = remaining.filter((dual) => !used.has(dual.cell));
  }
  return used;
};

// Cycle-decomposition sort planner. Emits the minimum number of drags
// (M - C, where M = misplaced pieces, C = number of pure cycles) for an
// assignment chosen to maximize C. Duplicate tiers make the per-tier
// assignment a free choice; picking it to maximize cycles is what keeps the
// drag count minimal.
//
// Same-tier merge guarantee: adjacent pieces in any misplacement cycle or
// chain always have different tiers, because P_i has tier wanted(S_{i+1})
// while P_{i+1} sits at S_{i+1} misplaced (tier != wanted(S_{i+1})). So
// chained swaps and the final move into an empty target can never trigger
// an in-game merge.
export const planSortDrags = (
  board: CellTier[],
  priorityCells: number[]
): SortMove[] => {
  if (board.length === 0) {
    return [];
  }

  // 1. Each priority slot wants the i-th piece in tier-desc order.
  const sortedDesc = [...board].sort((a, b) => b.tierNumber - a.tierNumber);
  const slotWanted = new Map<number, number>();
  for (let i = 0; i < sortedDesc.length; i++) {
    const slot = priorityCells[i];
    if (slot === undefined) {
      break;
    }
    slotWanted.set(slot, sortedDesc[i]!.tierNumber);
  }

  // 2. Pieces already at a correct-tier slot are fixed; they never move.
  const cellToPiece = new Map<number, CellTier>();
  for (const piece of board) {
    cellToPiece.set(piece.cell, piece);
  }
  const fixedCells = new Set<number>();
  for (const piece of board) {
    if (slotWanted.get(piece.cell) === piece.tierNumber) {
      fixedCells.add(piece.cell);
    }
  }

  // 3a. Cycle assignment first: dual cells (misplaced piece on a slot wanting
  // another tier) are the only cells that can form cycles. Assign them to
  // maximize the cycle count, which minimizes drags.
  const pieceTarget = new Map<number, number>();
  const duals: DualCell[] = [];
  for (const piece of board) {
    if (fixedCells.has(piece.cell)) {
      continue;
    }
    const want = slotWanted.get(piece.cell);
    if (want !== undefined) {
      duals.push({ cell: piece.cell, want, have: piece.tierNumber });
    }
  }
  const cycleCells = assignCycles(duals, pieceTarget);

  // 3b. Chain assignment for everything left: misplaced pieces not consumed by
  // a cycle (pure sources + leftover duals) routed to unfilled slots not
  // already targeted (pure empty targets + leftover duals). After cycle
  // peeling no cycles remain here, so any per-tier bijection yields only
  // chains, all of equal drag cost.
  const misplacedByTier = new Map<number, number[]>();
  for (const piece of board) {
    if (fixedCells.has(piece.cell) || cycleCells.has(piece.cell)) {
      continue;
    }
    const list = misplacedByTier.get(piece.tierNumber);
    if (list) {
      list.push(piece.cell);
    } else {
      misplacedByTier.set(piece.tierNumber, [piece.cell]);
    }
  }
  const unfilledByTier = new Map<number, number[]>();
  for (const [slot, wantedTier] of slotWanted) {
    if (fixedCells.has(slot) || cycleCells.has(slot)) {
      continue;
    }
    const list = unfilledByTier.get(wantedTier);
    if (list) {
      list.push(slot);
    } else {
      unfilledByTier.set(wantedTier, [slot]);
    }
  }
  for (const [tier, sources] of misplacedByTier) {
    const targets = unfilledByTier.get(tier) ?? [];
    for (let i = 0; i < sources.length; i++) {
      const target = targets[i];
      if (target === undefined) {
        continue;
      }
      pieceTarget.set(sources[i]!, target);
    }
  }
  if (pieceTarget.size === 0) {
    return [];
  }

  // 4. Decompose graph into chains then cycles, emit drags.
  const sourceCells = new Set(pieceTarget.keys());
  const targetCells = new Set(pieceTarget.values());
  const moves: SortMove[] = [];
  const visited = new Set<number>();

  // Chains: start at a source that is not anyone's target. Walk forward
  // until the next cell is not a source (empty target = chain end).
  // Forward emit keeps the source cell at chainNodes[0]; the carried
  // piece's tier is the original piece at chainNodes[i-1].
  for (const start of sourceCells) {
    if (visited.has(start) || targetCells.has(start)) {
      continue;
    }
    const chainNodes: number[] = [start];
    visited.add(start);
    let curr = start;
    while (pieceTarget.has(curr)) {
      const next = pieceTarget.get(curr)!;
      chainNodes.push(next);
      if (!sourceCells.has(next)) {
        break;
      }
      visited.add(next);
      curr = next;
    }
    for (let i = 1; i < chainNodes.length; i++) {
      const carried = cellToPiece.get(chainNodes[i - 1]!);
      if (carried === undefined) {
        continue;
      }
      moves.push(buildSortMove(chainNodes[0]!, chainNodes[i]!, carried.tier));
    }
  }

  // Cycles: remaining unvisited source cells form pure cycles. Walk until
  // we return to start. Same forward-emit pattern: source cell stays at
  // cycleNodes[0]; emit k-1 drags for a k-cycle.
  for (const start of sourceCells) {
    if (visited.has(start)) {
      continue;
    }
    const cycleNodes: number[] = [start];
    visited.add(start);
    let curr = pieceTarget.get(start)!;
    while (curr !== start) {
      cycleNodes.push(curr);
      visited.add(curr);
      curr = pieceTarget.get(curr)!;
    }
    for (let i = 1; i < cycleNodes.length; i++) {
      const carried = cellToPiece.get(cycleNodes[i - 1]!);
      if (carried === undefined) {
        continue;
      }
      moves.push(buildSortMove(cycleNodes[0]!, cycleNodes[i]!, carried.tier));
    }
  }

  return moves;
};
