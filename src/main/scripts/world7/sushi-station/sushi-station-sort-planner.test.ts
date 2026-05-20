import { describe, expect, it } from "vitest";
import {
  type CellTier,
  isBoardSorted,
  type SortMove,
} from "./sushi-station-board";
import { MAX_TEMPLATE_TIER, SUSHI_GRID } from "./sushi-station-constants";
import { planSortDrags } from "./sushi-station-sort-planner";

const COLS = SUSHI_GRID.COLUMNS;

const cellOf = (row: number, col: number): number => row * COLS + col;
const fromCellOf = (m: SortMove): number => cellOf(m.fromRow, m.fromCol);
const toCellOf = (m: SortMove): number => cellOf(m.toRow, m.toCol);

// Build a board from a tier-per-cell layout. A value of 0 means the cell is
// empty (no piece). cells default to a single top row 0,1,2,...
const board = (tiers: number[], cells?: number[]): CellTier[] => {
  const result: CellTier[] = [];
  for (let i = 0; i < tiers.length; i++) {
    const tierNumber = tiers[i]!;
    if (tierNumber === 0) {
      continue;
    }
    const cell = cells ? cells[i]! : i;
    result.push({ cell, tier: `T${tierNumber}`, tierNumber });
  }
  return result;
};

// Replay the planned drags against an in-flight simulated board, enforcing the
// in-game drag semantics: occupied target => swap, empty target => move. While
// replaying it asserts the two hard invariants the planner must never break:
//   1. No same-tier merge: when a drag's target is occupied at drag-time, the
//      dragged tier must differ from the target tier (else the game merges).
//   2. move.tier always equals the tier actually sitting at the source cell at
//      drag-time (the label the runner logs and the game sees).
const replayWithInvariants = (
  initial: CellTier[],
  moves: SortMove[]
): Map<number, number> => {
  const state = new Map<number, number>();
  for (const piece of initial) {
    state.set(piece.cell, piece.tierNumber);
  }

  for (const move of moves) {
    const fromCell = fromCellOf(move);
    const toCell = toCellOf(move);
    const fromTier = state.get(fromCell);

    expect(
      fromTier,
      `drag ${move.tier} [${move.fromRow},${move.fromCol}]->[${move.toRow},${move.toCol}] starts on an empty cell`
    ).toBeDefined();
    expect(move.tier, "move.tier must match the piece at the source cell").toBe(
      `T${fromTier}`
    );

    const toTier = state.get(toCell);
    if (toTier === undefined) {
      state.delete(fromCell);
      state.set(toCell, fromTier!);
    } else {
      expect(
        fromTier,
        `same-tier merge: dragging T${fromTier} onto T${toTier} at cell ${toCell}`
      ).not.toBe(toTier);
      state.set(toCell, fromTier!);
      state.set(fromCell, toTier);
    }
  }

  return state;
};

const finalBoard = (state: Map<number, number>): CellTier[] => {
  const result: CellTier[] = [];
  for (const [cell, tierNumber] of state) {
    result.push({ cell, tier: `T${tierNumber}`, tierNumber });
  }
  return result;
};

// Replay, enforce the no-merge / tier-label invariants, then assert the final
// board is sorted by the project's source-of-truth predicate.
const expectSortedAndSafe = (
  initial: CellTier[],
  priorityCells: number[]
): SortMove[] => {
  const moves = planSortDrags(initial, priorityCells);
  const state = replayWithInvariants(initial, moves);
  expect(isBoardSorted(finalBoard(state), priorityCells)).toBe(true);
  return moves;
};

// Park-Miller minimal-standard LCG: deterministic, seedable, and free of
// bitwise ops so it stays within the project's lint rules. Products stay
// well under Number.MAX_SAFE_INTEGER.
const seededRandom = (seed: number): (() => number) => {
  let state = seed % 2_147_483_647;
  if (state <= 0) {
    state += 2_147_483_646;
  }
  return () => {
    state = (state * 16_807) % 2_147_483_647;
    return (state - 1) / 2_147_483_646;
  };
};

// A tier-per-cell layout: 0 means empty, otherwise a tier in 1..maxTier.
const randomTiers = (
  rand: () => number,
  cellCount: number,
  emptyChance: number,
  maxTier: number
): number[] => {
  const tiers: number[] = [];
  for (let cell = 0; cell < cellCount; cell++) {
    tiers.push(rand() < emptyChance ? 0 : 1 + Math.floor(rand() * maxTier));
  }
  return tiers;
};

describe("planSortDrags - trivial inputs", () => {
  it("returns no drags for an empty board", () => {
    expect(planSortDrags([], [0, 1, 2])).toEqual([]);
  });

  it("returns no drags for an already-sorted board", () => {
    const moves = planSortDrags(board([5, 4, 3, 2, 1]), [0, 1, 2, 3, 4]);
    expect(moves).toEqual([]);
  });
});

describe("planSortDrags - final order", () => {
  it("places highest tier first, descending left-to-right", () => {
    const priority = [0, 1, 2, 3, 4];
    const moves = expectSortedAndSafe(board([2, 5, 1, 3, 4]), priority);
    const state = replayWithInvariants(board([2, 5, 1, 3, 4]), moves);
    expect(state.get(0)).toBe(5);
    expect(state.get(1)).toBe(4);
    expect(state.get(2)).toBe(3);
    expect(state.get(3)).toBe(2);
    expect(state.get(4)).toBe(1);
  });
});

describe("planSortDrags - minimum drag count", () => {
  it("sorts a single misplaced pair in one drag", () => {
    const moves = expectSortedAndSafe(board([1, 2]), [0, 1]);
    expect(moves).toHaveLength(1);
  });

  it("sorts a 3-cycle in two drags", () => {
    // cell0=1 (wants 3), cell1=3 (wants 2), cell2=2 (wants 1): one 3-cycle.
    const moves = expectSortedAndSafe(board([1, 3, 2]), [0, 1, 2]);
    expect(moves).toHaveLength(2);
  });

  it("moves a piece into an empty leading cell in one drag", () => {
    // cell0 empty (wants 2), cell1=1 (fixed, wants 1), cell2=2 (wants nothing
    // -> its piece feeds the empty leading slot). One move, no swap.
    const moves = expectSortedAndSafe(board([0, 1, 2]), [0, 1, 2]);
    expect(moves).toHaveLength(1);
  });

  it("picks a cycle-maximizing assignment for duplicate tiers", () => {
    // [T2,T2,T1,T3,T3,T1] over cells 0..5. cell5 (T1) is already fixed.
    // The remaining 5 misplaced pieces admit a (0 2 4)(1 3) decomposition =>
    // 5 - 2 cycles = 3 drags. A naive index-zip assignment yields a single
    // 5-cycle = 4 drags, which is the bug this refactor must fix.
    const moves = expectSortedAndSafe(
      board([2, 2, 1, 3, 3, 1]),
      [0, 1, 2, 3, 4, 5]
    );
    expect(moves).toHaveLength(3);
  });
});

describe("planSortDrags - randomized invariants", () => {
  it("always produces a sorted, merge-safe board across random layouts", () => {
    const rand = seededRandom(987_654_321);
    const availableCount = 10;
    const priority = Array.from({ length: availableCount }, (_, i) => i);

    for (let iteration = 0; iteration < 500; iteration++) {
      // ~20% empty, tiers in 1..5 (heavy duplicates).
      const tiers = randomTiers(rand, availableCount, 0.2, 5);
      const initial = board(tiers);
      const moves = planSortDrags(initial, priority);
      const state = replayWithInvariants(initial, moves);
      expect(
        isBoardSorted(finalBoard(state), priority),
        `layout ${JSON.stringify(tiers)} did not sort`
      ).toBe(true);
      // Never more drags than misplaced pieces (an upper bound on M - C).
      expect(moves.length).toBeLessThanOrEqual(initial.length);
    }
  });
});

describe("planSortDrags - full-range random boards", () => {
  // Realistic full grids: the whole 8x15 board, the entire T1..T59 tier range,
  // and a chunk of empty cells. Each case asserts the two hard invariants
  // (final order correct + no same-tier merge) plus the drag upper bound.
  const FULL_BOARD = SUSHI_GRID.ROWS * SUSHI_GRID.COLUMNS;
  const cases = [
    { seed: 11, cells: FULL_BOARD, emptyChance: 0.1, label: "nearly full" },
    { seed: 22, cells: FULL_BOARD, emptyChance: 0.35, label: "many gaps" },
    { seed: 33, cells: FULL_BOARD, emptyChance: 0.05, label: "almost packed" },
    { seed: 44, cells: 90, emptyChance: 0.2, label: "partial grid" },
    { seed: 55, cells: 60, emptyChance: 0.5, label: "sparse" },
  ];

  for (const { seed, cells, emptyChance, label } of cases) {
    it(`sorts a ${label} T1-T59 board (seed ${seed})`, () => {
      const rand = seededRandom(seed);
      const tiers = randomTiers(rand, cells, emptyChance, MAX_TEMPLATE_TIER);
      const priority = Array.from({ length: cells }, (_, i) => i);
      const initial = board(tiers);

      const moves = expectSortedAndSafe(initial, priority);
      expect(moves.length).toBeLessThanOrEqual(initial.length);
    });
  }
});
