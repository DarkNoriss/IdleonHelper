import {
  buildCellToTier,
  type CascadeStep,
  type CellTier,
  groupByTier,
  type MergePlan,
  TOTAL_CELLS,
} from "./sushi-station-board";

const MERGE_BASE_DELAY_MS = 1000;
const MERGE_TRIGGER_INCREMENT_MS = 100;

export const computeMergeWaitMs = (triggers: number): number =>
  MERGE_BASE_DELAY_MS + MERGE_TRIGGER_INCREMENT_MS * Math.max(0, triggers - 1);

// Cascade rule (D, "staircase"): the buff fires when the next cell's
// pre-merge tier is strictly less than the previous cell's pre-merge tier
// (and within the buff cap). First step's threshold is the merge result tier.
const simulateCascade = (
  cellToTier: ReadonlyMap<number, number>,
  rightCell: number,
  resultTier: number,
  buffCap: number
): CascadeStep[] => {
  const cascade: CascadeStep[] = [];
  let prevPreTier = resultTier;
  let cursor = rightCell;
  while (cursor < TOTAL_CELLS) {
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

// Cleanup merge for "stuck at 2" tiers in the HOTEW range. Used as a
// fallback when planNextMerge returns null (no 3+ tier ready to climb).
//
// Lift strategy: for the lowest 2-piece tier T in [minTier+1, buffCap],
// merge the LEFTMOST pair of T-1 pieces (pieces[0] -> pieces[1]). After
// sort, T-1's leftmost cells sit immediately right of the existing T
// cluster, so the merge result at T-1[1] clusters with the original T
// pieces. Cascade fires T-1 -> T at T-1[2], adding a SECOND new T piece.
// Net: T gains 2, T-1 burns 3.
//
// The post-cleanup sort phase closes the empty cell at T-1[0] before
// the next climb runs, keeping cluster boundaries clean.
export const planCleanupMerge = (
  board: CellTier[],
  buffCap: number
): MergePlan | null => {
  const cellToTier = buildCellToTier(board);
  const byTier = groupByTier(board);
  if (byTier.size === 0) {
    return null;
  }
  const minTier = Math.min(...byTier.keys());

  for (let t = minTier + 1; t <= buffCap; t++) {
    const tPieces = byTier.get(t);
    if (!tPieces || tPieces.length !== 2) {
      continue;
    }
    const lowerPieces = byTier.get(t - 1);
    if (!lowerPieces || lowerPieces.length < 2) {
      continue;
    }

    const sortedAsc = [...lowerPieces].sort((a, b) => a.cell - b.cell);
    const fromCell = sortedAsc[0]!.cell;
    const toCell = sortedAsc[1]!.cell;
    const mergeTier = t - 1;
    const resultTier = t;

    const cascade = simulateCascade(
      cellToTier,
      toCell + 1,
      resultTier,
      buffCap
    );

    return {
      fromCell,
      toCell,
      mergeTier,
      resultTier,
      cascade,
      cascadeFired: cascade.length > 0,
    };
  }
  return null;
};

// Merge above the HOTEW range. Used by the end-of-train unlock pass to
// drain the above-buffCap stockpile and grow the highest tier.
//
// HOTEW activates only when the INITIAL mergeTier is in buff range
// (mergeTier <= buffCap). For unlock merges, mergeTier > buffCap by
// construction, so no cascade fires regardless of what sits to the right
// of the merge target. So this plan is just a flat 2:1 swap. Pair selection
// is leftmost-first for parity with planNextMerge / planCleanupMerge; it
// has no effect since no cascade fires.
//
// upperBound is the inclusive max mergeTier to consider — caller passes
// MAX_TEMPLATE_TIER - 1 so results stay within the recognized template set.
export const planUnlockMerge = (
  board: CellTier[],
  buffCap: number,
  upperBound: number
): MergePlan | null => {
  const byTier = groupByTier(board);

  for (let t = buffCap + 1; t <= upperBound; t++) {
    const pieces = byTier.get(t);
    if (!pieces || pieces.length < 2) {
      continue;
    }

    const sortedAsc = [...pieces].sort((a, b) => a.cell - b.cell);
    return {
      fromCell: sortedAsc[0]!.cell,
      toCell: sortedAsc[1]!.cell,
      mergeTier: t,
      resultTier: t + 1,
      cascade: [],
      cascadeFired: false,
    };
  }
  return null;
};

// Strict 3+ rule, restricted to the HOTEW buff range.
//
// Eligible tiers must satisfy BOTH:
//   - tier <= buffCap (= highest - 6) — the cascade-eligible range, where the
//     HOTEW buff actually fires. Tiers above buffCap can't cascade so merging
//     them wastes the buff window.
//   - count >= 3 — guarantees a same-tier "bridge" piece survives the merge.
//
// Pair selection is leftmost-first: pieces[0] (leftmost) drags into
// pieces[1] (next-left), leaving pieces[2..] as bridges. After a sort phase
// same-tier pieces are clustered, so this is an adjacent drag and the
// cascade chains through the remaining bridges plus the descending stack
// to the right.
export const planNextMerge = (
  board: CellTier[],
  buffCap: number
): MergePlan | null => {
  const cellToTier = buildCellToTier(board);
  const byTier = groupByTier(board);
  const tiersDesc = [...byTier.keys()].sort((a, b) => b - a);

  for (const mergeTier of tiersDesc) {
    if (mergeTier > buffCap) {
      continue;
    }
    const pieces = byTier.get(mergeTier)!;
    if (pieces.length < 3) {
      continue;
    }

    const sortedAsc = [...pieces].sort((a, b) => a.cell - b.cell);
    const fromCell = sortedAsc[0]!.cell;
    const toCell = sortedAsc[1]!.cell;
    const resultTier = mergeTier + 1;

    const cascade = simulateCascade(
      cellToTier,
      toCell + 1,
      resultTier,
      buffCap
    );

    return {
      fromCell,
      toCell,
      mergeTier,
      resultTier,
      cascade,
      cascadeFired: cascade.length > 0,
    };
  }
  return null;
};
