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
//
// `emptyCell` is the from cell of the merge - treated as empty during
// simulation so the cascade chain breaks correctly when the from piece
// happens to sit on the cascade path. Without this, e.g., merging the
// rightmost piece of a count=2 cluster into the leftmost would predict
// a phantom cascade through the from cell that doesn't fire in-game.
const simulateCascade = (
  cellToTier: ReadonlyMap<number, number>,
  rightCell: number,
  resultTier: number,
  buffCap: number,
  emptyCell?: number
): CascadeStep[] => {
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

// Compute what the count of `targetTier` would be after a merge of
// `mergeTier` (consuming 2, producing 1 of mergeTier+1) plus the given
// cascade (each step shifts 1 piece from tierBefore to tierAfter).
const computePostMergeCount = (
  byTier: ReadonlyMap<number, CellTier[]>,
  targetTier: number,
  mergeTier: number,
  cascade: readonly CascadeStep[]
): number => {
  let count = byTier.get(targetTier)?.length ?? 0;
  if (targetTier === mergeTier) {
    count -= 2;
  }
  if (targetTier === mergeTier + 1) {
    count += 1;
  }
  for (const step of cascade) {
    if (targetTier === step.tierBefore) {
      count -= 1;
    }
    if (targetTier === step.tierAfter) {
      count += 1;
    }
  }
  return count;
};

// True only for the catastrophic shape from the original T16 bug:
// ZERO cascade AND merging tier ends at count=2. The merge consumed 2
// pieces, fired no buff, and the 2 pieces left behind are locked behind
// strict 3+. When ANY cascade fires, the chain advanced through the
// staircase and we keep the merge even if the merging tier ends at 2 -
// stuck tiers are recoverable via planCleanupMerge or future cascades,
// and disqualifying a 7+ step cascade over an incidental stuck state
// throws away the HOTEW window. Same rationale as allowing
// resultTier=2 for cascading merges.
const createsStuckState = (
  byTier: ReadonlyMap<number, CellTier[]>,
  mergeTier: number,
  cascade: readonly CascadeStep[]
): boolean => {
  if (cascade.length > 0) {
    return false;
  }
  return computePostMergeCount(byTier, mergeTier, mergeTier, cascade) === 2;
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
      buffCap,
      fromCell
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
// Pair selection differs by tier:
//
//   Non-highest (mergeTier < buffCap): LEFTMOST first
//     (from = sortedAsc[0], to = sortedAsc[1]). Result lands at the
//     left edge of the cluster so the next-tier-up staircase forms on
//     the left while the source cluster stays intact on the right.
//     Compact clusters cascade once (next cell is same-tier, breaks);
//     subsequent climbs grow the cascade as the staircase builds.
//
//   Highest (mergeTier === buffCap): smart pair (max cascade). This is
//     the "exit" merge that pushes a piece above buffCap and ends the
//     train, so we want the longest cascade through the staircase.
//
//   Non-highest fallback: if leftmost yields cascade=0 (e.g., cluster
//     split across rows with the leftmost pair isolated, T21 case),
//     fall through to smart pair to find a non-isolated pair.
//
// Smart pair: every piece is tried as `to`; `from` is the immediate
// left-neighbor in cell-order (or right-neighbor when `to` is leftmost).
// Adjacent-in-cluster `from` keeps drags same-row when the cluster is
// intact; pairs with `emptyCell` on `simulateCascade` so prediction
// matches reality when from sits on the cascade path.
//
// Tier walk is DESCENDING from buffCap, skipping any tier <= floor.
// Reason: pick the HIGHEST count>=3 tier first so the merge cascade
// flows through the descending staircase below it - one merge can
// chain through T_high -> T_high-1 -> ... -> T_low for a long cascade
// per merge. The cascade typically lifts the result tier to count>=3,
// enabling the next descending pick (e.g., T25 merge -> T26 count=3
// -> T26 buffCap merge). Train usually closes in 2-3 big-cascade
// merges per HOTEW window.
//
// Why not ascending: ascending picks the LOWEST count>=3 tier first,
// which is typically a dense same-tier cluster from cooking (e.g.,
// 7-piece T17). Leftmost on a dense cluster cascades only once (next
// cell is same-tier, cascade breaks at the second piece). The climb
// creeps up tier-by-tier with small cascades, and the row-0 staircase
// (T22, T25 from cooking) gets reached only after intermediate
// climbing has split the descending staircase below those tiers - so
// their cascades collapse to 1 too.
//
// No drain-tier exclusion in the climb walk: with descending walk the
// highest count>=3 tier wins naturally, so the secondLowest+1 buffer
// added nothing on the upside but starved post-cleanup climbs. After
// cleanup lifts a 2-piece tier to count=3+, the next planNextMerge
// has isTrainStart=false (drain gated off) AND no higher tier with
// count>=3 - the buffer would refuse the lifted tier and the train
// would end with cleanup as its only merge. Removing the buffer lets
// the climb fall through to the lifted tier so the cleanup pays off.
//
// Drain priority: at TRAIN START (isTrainStart === true), if the
// second-lowest HOTEW tier has count > 3, force a leftmost-pair merge
// to drain the stockpile and seed the climb chain. Reason: cooking
// refills second-lowest faster than climbs consume it (cascade
// T_low-1->T_low offsets the T_low->T_low+1 step in upper-tier climbs,
// net 0), so without an active drain the cluster grows over iterations.
// One drain consumes 3 T_low (-2 merge + -1 cascade, no T_low-1->T_low
// offset because cascade breaks at the next T_low piece) and bumps
// T_low+1 by 2 - enough to seed the climb chain with no further drains.
//
// Drain is gated on the isTrainStart flag rather than a state-derived
// invariant because T_low+1 drops back below 3 after each climb of it
// (climb consumes -2, cascade nets 0), so any state-based gate would
// either drain too often (re-firing after each climb) or never fire
// (e.g., refusing when a higher tier has count >= 3, which loses the
// chain-seeding effect when the user actually wants it). Stateless
// rules can't capture "once per train"; the caller knows.
//
// Same safety net: if leftmost would be cascade=0 AND post-mergeTier=2,
// fall through to the ascending walk.
//
// Monotonic floor: `floorTier` locks out tiers <= floorTier from the
// climb walk. Caller bumps it to the most recent merge tier so the
// train can't regress (e.g., after a T23 climb, T17 cluster regrowing
// to count=3 from cooking won't pull the next merge back down). At
// train start floorTier is 0 so the climb runs from secondLowest+1.
export const planNextMerge = (
  board: CellTier[],
  buffCap: number,
  isTrainStart = false,
  floorTier = 0
): MergePlan | null => {
  const cellToTier = buildCellToTier(board);
  const byTier = groupByTier(board);
  const tiersAsc = [...byTier.keys()].sort((a, b) => a - b);

  const tiersAscInHotew = tiersAsc.filter((t) => t <= buffCap);
  const secondLowestInHotew =
    tiersAscInHotew.length >= 2 ? tiersAscInHotew[1]! : null;
  if (isTrainStart && secondLowestInHotew !== null) {
    const pieces = byTier.get(secondLowestInHotew)!;
    if (pieces.length > 3) {
      const sortedAsc = [...pieces].sort((a, b) => a.cell - b.cell);
      const from = sortedAsc[0]!;
      const to = sortedAsc[1]!;
      const resultTier = secondLowestInHotew + 1;
      const cascade = simulateCascade(
        cellToTier,
        to.cell + 1,
        resultTier,
        buffCap,
        from.cell
      );
      if (!createsStuckState(byTier, secondLowestInHotew, cascade)) {
        return {
          fromCell: from.cell,
          toCell: to.cell,
          mergeTier: secondLowestInHotew,
          resultTier,
          cascade,
          cascadeFired: cascade.length > 0,
        };
      }
    }
  }

  // Climb walks every HOTEW tier strictly above the lowest tier (and
  // above the monotonic floor). The lowest tier is excluded because a
  // merge there is fundamentally a cleanup operation (it lifts the
  // second-lowest, which is what planCleanupMerge does) - and only the
  // cleanup path runs sortPhase afterward. Without the exclusion the
  // climb picks the lowest tier directly when nothing higher has
  // count>=3, the resulting lifted-tier pieces land fragmented across
  // the existing same-tier pieces, and the next climb has to fall back
  // to smart-pair instead of leftmost. Routing through cleanup keeps
  // the post-merge state consolidated.
  const lowestTier = tiersAsc[0];
  const lowestExclusion = lowestTier === undefined ? 0 : lowestTier + 1;
  const climbStart = Math.max(lowestExclusion, floorTier + 1);
  for (let i = tiersAscInHotew.length - 1; i >= 0; i--) {
    const mergeTier = tiersAscInHotew[i]!;
    if (mergeTier < climbStart) {
      continue;
    }
    const pieces = byTier.get(mergeTier)!;
    if (pieces.length < 3) {
      continue;
    }

    const sortedAsc = [...pieces].sort((a, b) => a.cell - b.cell);
    const resultTier = mergeTier + 1;
    const isHighest = mergeTier === buffCap;

    if (!isHighest) {
      const from = sortedAsc[0]!;
      const to = sortedAsc[1]!;
      const cascade = simulateCascade(
        cellToTier,
        to.cell + 1,
        resultTier,
        buffCap,
        from.cell
      );
      if (
        cascade.length > 0 &&
        !createsStuckState(byTier, mergeTier, cascade)
      ) {
        return {
          fromCell: from.cell,
          toCell: to.cell,
          mergeTier,
          resultTier,
          cascade,
          cascadeFired: true,
        };
      }
    }

    let best: {
      from: CellTier;
      to: CellTier;
      cascade: CascadeStep[];
    } | null = null;
    for (let i = 0; i < sortedAsc.length; i++) {
      const to = sortedAsc[i]!;
      const from = i > 0 ? sortedAsc[i - 1]! : sortedAsc[i + 1]!;
      const cascade = simulateCascade(
        cellToTier,
        to.cell + 1,
        resultTier,
        buffCap,
        from.cell
      );
      if (createsStuckState(byTier, mergeTier, cascade)) {
        continue;
      }
      if (best === null || cascade.length > best.cascade.length) {
        best = { from, to, cascade };
      }
    }

    if (best === null) {
      continue;
    }

    return {
      fromCell: best.from.cell,
      toCell: best.to.cell,
      mergeTier,
      resultTier,
      cascade: best.cascade,
      cascadeFired: best.cascade.length > 0,
    };
  }
  return null;
};
