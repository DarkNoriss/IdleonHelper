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

// Cycle-decomposition sort planner. Emits the minimum number of drags
// (M - C, where M = misplaced pieces, C = number of pure cycles).
//
// Same-tier merge guarantee: adjacent pieces in any misplacement cycle or
// chain always have different tiers, because P_i has tier wanted(S_{i+1})
// while P_{i+1} sits at S_{i+1} misplaced (tier != wanted(S_{i+1})). So
// chained swaps and the final move into an empty target can never trigger
// an in-game merge.
export const planSortDrags = (
  board: CellTier[],
  priorityCells: number[],
  _availableCells: ReadonlySet<number>
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

  // 3. Per-tier assignment: misplaced T-pieces -> unfilled T-slots. Same-tier
  // pieces are interchangeable so any bijection works.
  const misplacedByTier = new Map<number, number[]>();
  for (const piece of board) {
    if (fixedCells.has(piece.cell)) {
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
    if (fixedCells.has(slot)) {
      continue;
    }
    const list = unfilledByTier.get(wantedTier);
    if (list) {
      list.push(slot);
    } else {
      unfilledByTier.set(wantedTier, [slot]);
    }
  }
  const pieceTarget = new Map<number, number>();
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
