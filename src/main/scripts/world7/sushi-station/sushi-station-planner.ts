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

// Strategy: pick the highest tier with a forward-drag pair, then within that
// tier prefer the pair whose right neighbor would receive WoE buff (cascade
// tiebreaker). Tiebreaker after buff-tier: earlier toCell. Always-highest
// guarantees the high-tier pile drains every iteration so `buffCap` keeps
// rising; cascades still happen naturally once the working tier reaches a
// level where its right neighbor sits at or below `buffCap`, and those
// cascades chain through more of the descending board than cascade-first
// could ever produce.
export const planBestMerge = (
  board: CellTier[],
  buffCap: number
): MergePlan | null => {
  const cellToTier = buildCellToTier(board);
  const byTier = groupByTier(board);
  const tiersDesc = [...byTier.keys()].sort((a, b) => b - a);

  for (const mergeTier of tiersDesc) {
    const pieces = byTier.get(mergeTier)!;
    if (pieces.length < 2) {
      continue;
    }
    const resultTier = mergeTier + 1;

    let best: MergePlan | null = null;
    let bestBuffTier = -1;
    let bestToCell = Number.POSITIVE_INFINITY;

    for (let i = 0; i < pieces.length; i++) {
      for (let j = 0; j < pieces.length; j++) {
        if (i === j) {
          continue;
        }
        const fromCell = pieces[i]!.cell;
        const toCell = pieces[j]!.cell;
        if (fromCell >= toCell) {
          continue;
        }

        const rightCell = toCell + 1;
        let buffTier = -1;
        let cascade: CascadeStep[] = [];
        if (rightCell < TOTAL_CELLS) {
          const rightTier = cellToTier.get(rightCell);
          if (
            rightTier !== undefined &&
            rightTier <= buffCap &&
            rightTier < resultTier
          ) {
            buffTier = rightTier;
            cascade = simulateCascade(
              cellToTier,
              rightCell,
              resultTier,
              buffCap
            );
          }
        }

        const better =
          buffTier > bestBuffTier ||
          (buffTier === bestBuffTier && toCell < bestToCell);

        if (better) {
          bestBuffTier = buffTier;
          bestToCell = toCell;
          best = {
            fromCell,
            toCell,
            mergeTier,
            resultTier,
            cascade,
            cascadeFired: buffTier >= 0,
          };
        }
      }
    }

    if (best) {
      return best;
    }
  }
  return null;
};
