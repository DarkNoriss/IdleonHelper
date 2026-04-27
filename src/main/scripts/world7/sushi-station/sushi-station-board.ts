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
