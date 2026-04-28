import type { Point, RegionResult } from "../../../backend/index";
import { parseTierNumber, SUSHI_GRID } from "./sushi-station-constants";

export const TOTAL_CELLS = SUSHI_GRID.ROWS * SUSHI_GRID.COLUMNS;

export type CellTier = { cell: number; tier: string; tierNumber: number };

export type CascadeStep = {
  cell: number;
  tierBefore: number;
  tierAfter: number;
};

export type MergePlan = {
  fromCell: number;
  toCell: number;
  mergeTier: number;
  resultTier: number;
  cascade: CascadeStep[];
  cascadeFired: boolean;
};

export type SortMove = {
  from: Point;
  to: Point;
  tier: string;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
};

export const cellToPoint = (cellIndex: number): Point => {
  const col = cellIndex % SUSHI_GRID.COLUMNS;
  const row = Math.floor(cellIndex / SUSHI_GRID.COLUMNS);
  return {
    x: SUSHI_GRID.FIRST_POSITION.x + col * SUSHI_GRID.X_STEP,
    y: SUSHI_GRID.FIRST_POSITION.y + row * SUSHI_GRID.Y_STEP,
  };
};

export const formatCell = (cell: number): string => {
  const col = cell % SUSHI_GRID.COLUMNS;
  const row = Math.floor(cell / SUSHI_GRID.COLUMNS);
  return `[${row},${col}]`;
};

export const formatTierLabel = (tier: number | undefined): string =>
  tier === undefined ? "___" : `T${tier}`;

export const buildBoardFromResults = (results: RegionResult[]): CellTier[] => {
  const board: CellTier[] = [];
  for (const result of results) {
    if (result.match === null) {
      continue;
    }
    const tierNumber = parseTierNumber(result.match);
    if (tierNumber === null) {
      continue;
    }
    board.push({
      cell: result.regionIndex,
      tier: result.match,
      tierNumber,
    });
  }
  return board;
};

export const buildCellToTier = (board: CellTier[]): Map<number, number> => {
  const map = new Map<number, number>();
  for (const piece of board) {
    map.set(piece.cell, piece.tierNumber);
  }
  return map;
};

export const groupByTier = (board: CellTier[]): Map<number, CellTier[]> => {
  const byTier = new Map<number, CellTier[]>();
  for (const piece of board) {
    const list = byTier.get(piece.tierNumber);
    if (list) {
      list.push(piece);
    } else {
      byTier.set(piece.tierNumber, [piece]);
    }
  }
  return byTier;
};

export const getHighestTier = (board: CellTier[]): number | null => {
  let highest = -1;
  for (const piece of board) {
    if (piece.tierNumber > highest) {
      highest = piece.tierNumber;
    }
  }
  return highest === -1 ? null : highest;
};

export const getLowestTier = (board: CellTier[]): number | null => {
  let lowest = Number.POSITIVE_INFINITY;
  for (const piece of board) {
    if (piece.tierNumber < lowest) {
      lowest = piece.tierNumber;
    }
  }
  return lowest === Number.POSITIVE_INFINITY ? null : lowest;
};

export const getHighestTierWithCount = (
  board: CellTier[],
  minCount: number
): number | null => {
  const byTier = groupByTier(board);
  let highest: number | null = null;
  for (const [tier, pieces] of byTier) {
    if (pieces.length < minCount) {
      continue;
    }
    if (highest === null || tier > highest) {
      highest = tier;
    }
  }
  return highest;
};

export const getLowestTierWithCount = (
  board: CellTier[],
  minCount: number
): number | null => {
  const byTier = groupByTier(board);
  let lowest: number | null = null;
  for (const [tier, pieces] of byTier) {
    if (pieces.length < minCount) {
      continue;
    }
    if (lowest === null || tier < lowest) {
      lowest = tier;
    }
  }
  return lowest;
};

export const countEmpty = (
  board: CellTier[],
  availableCells: ReadonlySet<number>
): number => {
  const occupied = new Set<number>();
  for (const piece of board) {
    occupied.add(piece.cell);
  }
  let empty = 0;
  for (const cell of availableCells) {
    if (!occupied.has(cell)) {
      empty++;
    }
  }
  return empty;
};

// True when the merge plan's cascade stopped at an empty cell on the
// board (an empty hole on the cascade walk path), as opposed to a
// natural break (tier-equality, above-buffCap, or end-of-board /
// non-available).
//
// Used by the train as a lookahead: after each climb merge, run
// planNextMerge against the post-merge board and check whether the
// chosen tier's cascade would be capped by a hole. If yes the gap
// matters and sortPhase should consolidate; if no (the planner picked
// a tier whose leftmost-pair walks AROUND the gap, e.g. the
// "T20 ___ T20 T20" row-break-spanning cluster), the gap is benign
// and sorting wastes drags.
//
// Why structural heuristics weren't enough: a hole at cell C between
// two occupied T pieces looks identical regardless of which tier the
// planner picks next. If the planner's descending walk picks T (the
// gap-spanning cluster), leftmost-pair skips C; if it picks a higher
// tier T', T' climbs from r0 and its cascade walks rightward straight
// into C. Only inspecting the actual chosen plan distinguishes them.
export const cascadeBlockedByEmpty = (
  plan: MergePlan,
  board: CellTier[],
  availableCells: ReadonlySet<number>
): boolean => {
  const endCell = plan.toCell + 1 + plan.cascade.length;
  if (endCell >= TOTAL_CELLS) {
    return false;
  }
  if (!availableCells.has(endCell)) {
    return false;
  }
  for (const piece of board) {
    if (piece.cell === endCell) {
      return false;
    }
  }
  return true;
};

// Same-tier pieces are interchangeable for sort purposes. Prefer the
// rightmost mismatched same-tier piece as the source so a row-of-T1s
// gap is filled by one long drag instead of N-1 left-shift drags.
// Returns null when there is no move (sorted) or there is more sushi
// than priority cells (caller decides whether to log/abort).
//
// Same-tier collision guard: if the priority slot is already occupied
// by a piece of the expected tier, treat it as satisfied and continue.
// Without this, the source picked below could be dragged onto a same-
// tier piece and the in-game drag would MERGE them (T16 + T16 -> T17),
// silently destroying a piece mid-sort. Confirmed in iter-2 trace where
// 4 T16s post-cleanup collapsed to 2 T16 + 1 extra T17 across 7 drags.
export const pickSortMove = (
  board: CellTier[],
  priorityCells: number[]
): SortMove | null => {
  const cellToTier = buildCellToTier(board);
  const sorted = [...board].sort((a, b) => b.tierNumber - a.tierNumber);

  for (let i = 0; i < sorted.length; i++) {
    const target = priorityCells[i];
    if (target === undefined) {
      return null;
    }
    const expected = sorted[i]!;
    if (expected.cell === target) {
      continue;
    }
    if (cellToTier.get(target) === expected.tierNumber) {
      continue;
    }

    let source = expected;
    for (let k = sorted.length - 1; k > i; k--) {
      const candidate = sorted[k]!;
      if (candidate.tierNumber !== expected.tierNumber) {
        continue;
      }
      const candidateTarget = priorityCells[k];
      if (candidateTarget !== undefined && candidate.cell !== candidateTarget) {
        source = candidate;
        break;
      }
    }

    const fromCol = source.cell % SUSHI_GRID.COLUMNS;
    const fromRow = Math.floor(source.cell / SUSHI_GRID.COLUMNS);
    const toCol = target % SUSHI_GRID.COLUMNS;
    const toRow = Math.floor(target / SUSHI_GRID.COLUMNS);

    return {
      from: cellToPoint(source.cell),
      to: cellToPoint(target),
      tier: source.tier,
      fromRow,
      fromCol,
      toRow,
      toCol,
    };
  }

  return null;
};

// True when every priority slot holds the tier dictated by descending
// piece order. Source of truth for "is the board sorted?" - do not infer
// from planSortDrags returning 0 moves, because a full board with
// mismatches also returns 0 (place + evict both blocked, see below).
export const isBoardSorted = (
  board: CellTier[],
  priorityCells: number[]
): boolean => {
  const cellToTier = buildCellToTier(board);
  const sortedPieces = [...board].sort((a, b) => b.tierNumber - a.tierNumber);
  for (let i = 0; i < sortedPieces.length; i++) {
    const slot = priorityCells[i];
    if (slot === undefined) {
      break;
    }
    if (cellToTier.get(slot) !== sortedPieces[i]!.tierNumber) {
      return false;
    }
  }
  return true;
};

// Plan an entire sort as a sequence of drags computed up front, with no
// scans between drags. Steps 1 and 2 produce empty-target drags only,
// so they can never trigger an in-game same-tier merge. Step 3 is a
// direct-swap fallback for full boards (no empty scratch cells): it
// drags a piece of the wanted tier onto a wrong-tier slot, relying on
// the game's drop-on-different-tier swap behavior. The same-tier check
// at the source is enforced (`occupant.tierNumber !== wanted` and the
// swap source has tier = wanted), so step 3 also cannot merge.
//
// Algorithm (greedy with bounded fallback):
//   1. Place: find a priority slot that is empty in the simulated state
//      and wants tier T. Find any piece of T elsewhere whose own slot
//      does not want T (so moving it does not break a satisfied slot).
//      Drag piece -> slot.
//   2. Evict: if no place move is available but mismatches remain, pick
//      a priority slot whose occupant is the wrong tier and move that
//      occupant to any empty cell. This frees the slot for a future
//      place move.
//   3. Swap: if neither place nor evict can progress (full board, no
//      empty cells), find a misplaced slot A and any non-satisfied cell
//      B that holds A's wanted tier. Drag B -> A; the game swaps the
//      pieces (A becomes satisfied, B inherits A's old wrong tier and
//      may need further work).
// Loop until satisfied or no progress is possible. The piece-count and
// tier-multiset is preserved (no merges) so termination is bounded by
// priorityCells.length * 4.
const buildSortMove = (piece: CellTier, targetCell: number): SortMove => ({
  from: cellToPoint(piece.cell),
  to: cellToPoint(targetCell),
  tier: piece.tier,
  fromRow: Math.floor(piece.cell / SUSHI_GRID.COLUMNS),
  fromCol: piece.cell % SUSHI_GRID.COLUMNS,
  toRow: Math.floor(targetCell / SUSHI_GRID.COLUMNS),
  toCol: targetCell % SUSHI_GRID.COLUMNS,
});

export const planSortDrags = (
  board: CellTier[],
  priorityCells: number[],
  availableCells: ReadonlySet<number>
): SortMove[] => {
  const cellToPiece = new Map<number, CellTier>();
  for (const piece of board) {
    cellToPiece.set(piece.cell, piece);
  }

  const sortedPieces = [...board].sort((a, b) => b.tierNumber - a.tierNumber);
  const wantedAt = new Map<number, number>();
  for (let i = 0; i < sortedPieces.length; i++) {
    const slot = priorityCells[i];
    if (slot === undefined) {
      break;
    }
    wantedAt.set(slot, sortedPieces[i]!.tierNumber);
  }

  const moves: SortMove[] = [];
  const maxMoves = priorityCells.length * 4;

  while (moves.length < maxMoves) {
    let progressed = false;

    for (const slot of priorityCells) {
      const wanted = wantedAt.get(slot);
      if (wanted === undefined) {
        continue;
      }
      const occupant = cellToPiece.get(slot);
      if (occupant !== undefined) {
        continue;
      }

      let sourcePiece: CellTier | null = null;
      for (const [cell, piece] of cellToPiece) {
        if (piece.tierNumber !== wanted) {
          continue;
        }
        if (wantedAt.get(cell) === wanted) {
          continue;
        }
        sourcePiece = piece;
        break;
      }
      if (sourcePiece !== null) {
        moves.push(buildSortMove(sourcePiece, slot));
        cellToPiece.delete(sourcePiece.cell);
        cellToPiece.set(slot, { ...sourcePiece, cell: slot });
        progressed = true;
        break;
      }
    }
    if (progressed) {
      continue;
    }

    for (const slot of priorityCells) {
      const wanted = wantedAt.get(slot);
      const occupant = cellToPiece.get(slot);
      if (occupant === undefined) {
        continue;
      }
      if (occupant.tierNumber === wanted) {
        continue;
      }

      let emptyCell: number | null = null;
      for (const cell of availableCells) {
        if (cell === slot) {
          continue;
        }
        if (!cellToPiece.has(cell)) {
          emptyCell = cell;
          break;
        }
      }
      if (emptyCell !== null) {
        moves.push(buildSortMove(occupant, emptyCell));
        cellToPiece.delete(occupant.cell);
        cellToPiece.set(emptyCell, { ...occupant, cell: emptyCell });
        progressed = true;
        break;
      }
    }
    if (progressed) {
      continue;
    }

    for (const slot of priorityCells) {
      const wanted = wantedAt.get(slot);
      if (wanted === undefined) {
        continue;
      }
      const occupant = cellToPiece.get(slot);
      if (occupant === undefined) {
        continue;
      }
      if (occupant.tierNumber === wanted) {
        continue;
      }

      let swapPiece: CellTier | null = null;
      for (const [cell, piece] of cellToPiece) {
        if (cell === slot) {
          continue;
        }
        if (piece.tierNumber !== wanted) {
          continue;
        }
        if (wantedAt.get(cell) === piece.tierNumber) {
          continue;
        }
        swapPiece = piece;
        break;
      }
      if (swapPiece !== null) {
        moves.push(buildSortMove(swapPiece, slot));
        const swapOldCell = swapPiece.cell;
        cellToPiece.set(slot, { ...swapPiece, cell: slot });
        cellToPiece.set(swapOldCell, { ...occupant, cell: swapOldCell });
        progressed = true;
        break;
      }
    }
    if (!progressed) {
      break;
    }
  }

  return moves;
};

// Duplicated from sushi-station-planner.ts (private there). Pulling into
// a shared module would either touch planner.ts (still owned by the
// merge-debug tool) or create a circular import.
export const simulateCascade = (
  cellToTier: ReadonlyMap<number, number>,
  rightCell: number,
  resultTier: number,
  buffCap: number,
  emptyCell?: number
): CascadeStep[] => {
  // HOTEW only fires when the merge's pre-merge tier is in the buff range
  // (mergeTier <= buffCap, equivalently resultTier - 1 <= buffCap). Above-
  // buffCap merges are flat 2:1 swaps with no cascade regardless of what
  // sits to the right of the merge target.
  if (resultTier - 1 > buffCap) {
    return [];
  }
  const cascade: CascadeStep[] = [];
  let prevPreTier = resultTier;
  let cursor = rightCell;
  while (cursor < TOTAL_CELLS) {
    if (cursor === emptyCell) {
      break;
    }
    const currentTier = cellToTier.get(cursor);
    if (currentTier === undefined) {
      break;
    }
    if (currentTier > buffCap) {
      break;
    }
    if (currentTier >= prevPreTier) {
      break;
    }
    cascade.push({
      cell: cursor,
      tierBefore: currentTier,
      tierAfter: currentTier + 1,
    });
    prevPreTier = currentTier;
    cursor++;
  }
  return cascade;
};

// Predict the post-merge board for a leftmost-pair merge. Returns the
// cascade list plus the projected board. Used by the heat-of-the-east-wind
// script to log expected state and verify against the post-drag rescan.
//
// buffCap caps the cascade walk only; merging above buffCap is allowed
// and just yields cascade=[] (flat 2:1 swap).
export const simulateMerge = (
  board: CellTier[],
  fromCell: number,
  toCell: number,
  mergeTier: number,
  buffCap: number
): { cascade: CascadeStep[]; postBoard: CellTier[] } => {
  const cellToTier = buildCellToTier(board);
  const resultTier = mergeTier + 1;
  const cascade = simulateCascade(
    cellToTier,
    toCell + 1,
    resultTier,
    buffCap,
    fromCell
  );

  const projected = new Map(cellToTier);
  projected.delete(fromCell);
  projected.set(toCell, resultTier);
  for (const step of cascade) {
    projected.set(step.cell, step.tierAfter);
  }

  const postBoard: CellTier[] = [];
  for (const [cell, tierNumber] of projected) {
    postBoard.push({ cell, tier: `T${tierNumber}`, tierNumber });
  }
  return { cascade, postBoard };
};

// Compare predicted vs actual post-merge state. Logs FAIL for predicted
// cells that don't match, EXTRA for unpredicted changes, and a summary
// pass/total + extras line.
export const verifyMergeOutcome = (
  fromCell: number,
  toCell: number,
  resultTier: number,
  cascade: readonly CascadeStep[],
  preMergeBoard: CellTier[],
  actualBoard: CellTier[],
  availableCells: ReadonlySet<number>,
  log: (msg: string) => void
): void => {
  const preCellToTier = buildCellToTier(preMergeBoard);
  const postCellToTier = buildCellToTier(actualBoard);

  const formatActual = (tier: number | undefined): string =>
    tier === undefined ? "empty" : `T${tier}`;

  let passes = 0;
  let total = 0;

  total++;
  const fromActual = postCellToTier.get(fromCell);
  if (fromActual === undefined) {
    passes++;
  } else {
    log(
      `  FAIL ${formatCell(fromCell)} expected empty, actual ${formatActual(fromActual)}`
    );
  }

  total++;
  const toActual = postCellToTier.get(toCell);
  if (toActual === resultTier) {
    passes++;
  } else {
    log(
      `  FAIL ${formatCell(toCell)} expected T${resultTier}, actual ${formatActual(toActual)}`
    );
  }

  for (const step of cascade) {
    total++;
    const actual = postCellToTier.get(step.cell);
    if (actual === step.tierAfter) {
      passes++;
    } else {
      log(
        `  FAIL ${formatCell(step.cell)} expected T${step.tierAfter}, actual ${formatActual(actual)}`
      );
    }
  }

  const predictedCells = new Set<number>();
  predictedCells.add(fromCell);
  predictedCells.add(toCell);
  for (const step of cascade) {
    predictedCells.add(step.cell);
  }

  let extras = 0;
  for (const cell of availableCells) {
    if (predictedCells.has(cell)) {
      continue;
    }
    const pre = preCellToTier.get(cell);
    const post = postCellToTier.get(cell);
    if (pre !== post) {
      log(
        `  EXTRA ${formatCell(cell)} ${formatActual(pre)} -> ${formatActual(post)} (not predicted)`
      );
      extras++;
    }
  }

  if (extras > 0) {
    const actualTriggers = cascade.length + extras;
    log(
      `verification: ${passes}/${total} predictions match, ${extras} unpredicted (actual cascade ~${actualTriggers} triggers)`
    );
  } else {
    log(`verification: ${passes}/${total} predictions match`);
  }
};

const CELL_WIDTH = 5;

export const logBoardGrid = (
  log: (msg: string) => void,
  label: string,
  board: CellTier[],
  availableCells: ReadonlySet<number>
): void => {
  log(label);
  const cellToTier = buildCellToTier(board);

  let header = "    ";
  for (let c = 0; c < SUSHI_GRID.COLUMNS; c++) {
    header += `c${c}`.padStart(CELL_WIDTH, " ");
  }
  log(header);

  for (let r = 0; r < SUSHI_GRID.ROWS; r++) {
    let line = `r${r}`.padEnd(4, " ");
    for (let c = 0; c < SUSHI_GRID.COLUMNS; c++) {
      const cell = r * SUSHI_GRID.COLUMNS + c;
      if (!availableCells.has(cell)) {
        line += "-".padStart(CELL_WIDTH, " ");
        continue;
      }
      line += formatTierLabel(cellToTier.get(cell)).padStart(CELL_WIDTH, " ");
    }
    log(line);
  }
};
