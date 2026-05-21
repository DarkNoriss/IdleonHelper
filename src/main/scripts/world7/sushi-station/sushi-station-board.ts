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

// Compares two boards by tier composition (how many pieces of each tier),
// ignoring cell positions. The sort step reshuffles positions every cycle
// without changing what is on the board, so progress detection must look at
// composition, not coordinates.
export const boardCompositionEqual = (
  a: CellTier[],
  b: CellTier[]
): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  const counts = new Map<number, number>();
  for (const piece of a) {
    counts.set(piece.tierNumber, (counts.get(piece.tierNumber) ?? 0) + 1);
  }
  for (const piece of b) {
    const remaining = (counts.get(piece.tierNumber) ?? 0) - 1;
    if (remaining < 0) {
      return false;
    }
    counts.set(piece.tierNumber, remaining);
  }
  return true;
};

export type DrainDecision =
  | { action: "merge"; candidateTier: number; isFloorFallback: boolean }
  | {
      action: "stop";
      reason: "empty" | "no-candidate" | "below-peak" | "no-feedstock";
    };

// Pure candidate-selection + watermark decision for the HOTEW merge (drain)
// phase. Ported verbatim from the old inline drain loop, except the watermark
// is now the session PEAK (highest tier merged) instead of the minimum.
//
// HOTEW cascades only promote tiers upward, so within one merge phase the
// candidate climbs (+1 per step). Tracking the peak and stopping on
// `candidate < peak` ends the phase the instant the climb wraps back down to
// the working floor - the "no higher tier, reseed" signal. The old min
// watermark missed this whenever the climb started at the working floor
// (peak==min), letting the floor be re-merged forever.
export const decideDrainCandidate = (params: {
  board: CellTier[];
  peakTier: number | null;
  mergeAboveHotew: boolean;
  maxTemplateTier: number;
}): DrainDecision => {
  const { board, peakTier, mergeAboveHotew, maxTemplateTier } = params;

  const lowestTier = getLowestTier(board);
  if (lowestTier === null) {
    return { action: "stop", reason: "empty" };
  }
  const drainFloor = lowestTier + 1;

  // Feedstock-depletion stop: the drain phase only sustains the chain while a
  // bulk low-tier plateau keeps feeding cascades. Once no tier at or below the
  // drain floor (lowestTier + 1, recomputed from each live scan) still has 3+
  // copies, the next merge would cascade into the staircase itself and break
  // the chain - so end the phase and reseed, even if mergeable pairs remain
  // higher up.
  const lowestFeedstockTier = getLowestTierWithCount(board, 3);
  if (lowestFeedstockTier === null || lowestFeedstockTier > drainFloor) {
    return { action: "stop", reason: "no-feedstock" };
  }

  const highest = getHighestTier(board);
  const buffCap = highest === null ? null : highest - 6; // 6 = HOTEW buff range width (highest tier minus 6)

  const eligible = board.filter((piece) => {
    if (piece.tierNumber <= drainFloor) {
      return false;
    }
    if (piece.tierNumber === maxTemplateTier) {
      return false;
    }
    if (!mergeAboveHotew && buffCap !== null && piece.tierNumber > buffCap) {
      return false;
    }
    return true;
  });

  const aboveCandidate = getHighestTierWithCount(eligible, 2);
  const floorCount = board.filter(
    (piece) => piece.tierNumber === drainFloor
  ).length;
  const useFloorFallback =
    aboveCandidate === null &&
    drainFloor !== maxTemplateTier &&
    floorCount >= 3;
  const candidateTier = useFloorFallback ? drainFloor : aboveCandidate;
  const isFloorFallback = useFloorFallback;

  if (candidateTier === null) {
    return { action: "stop", reason: "no-candidate" };
  }

  if (peakTier !== null && candidateTier < peakTier) {
    return { action: "stop", reason: "below-peak" };
  }

  return { action: "merge", candidateTier, isFloorFallback };
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

// True when every priority slot holds the tier dictated by descending
// piece order. Source of truth for "is the board sorted?" - do not infer
// from planSortDrags returning 0 moves, because the planner can emit 0
// drags in edge cases (eg per-tier count mismatch) without the board
// being sorted.
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
