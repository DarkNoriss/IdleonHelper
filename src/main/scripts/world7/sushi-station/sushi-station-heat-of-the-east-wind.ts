import { backendCommand } from "../../../backend/index";
import { delay, logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  buildBoardFromResults,
  type CellTier,
  cellToPoint,
  countEmpty,
  formatCell,
  getHighestTier,
  getHighestTierWithCount,
  getLowestTier,
  getLowestTierWithCount,
  logBoardGrid,
  simulateMerge,
  verifyMergeOutcome,
} from "./sushi-station-board";
import {
  buildSushiRegions,
  GRID_SLOT,
  GRID_SLOT_RED,
  GRID_SLOT_YELLOW,
  getPriorityCells,
  MAX_TEMPLATE_TIER,
  pointToCellIndex,
  SUSHI_CLICK_OPTIONS,
  SUSHI_COOK,
  SUSHI_DRAG_OPTIONS,
  SUSHI_HSV_LOWER,
  SUSHI_HSV_UPPER,
  SUSHI_TEMPLATES,
  SUSHI_TIERS_OFF,
  SUSHI_TIERS_ON,
} from "./sushi-station-constants";
import { runPlannedSort } from "./sushi-station-sort-runner";

const MERGE_BASE_DELAY_MS = 1250;
const MERGE_TRIGGER_INCREMENT_MS = 100;
const COOK_DELAY_MS = 1250;

const computeMergeWaitMs = (triggers: number): number =>
  MERGE_BASE_DELAY_MS + MERGE_TRIGGER_INCREMENT_MS * Math.max(0, triggers - 1);

const log = (msg: string): void =>
  logger.log(`sushi-station-heat-of-the-east-wind - ${msg}`);

const formatTierOrNone = (tier: number | null): string =>
  tier === null ? "none" : `T${tier}`;

export default defineScript<[boolean, boolean]>({
  id: "world7.sushiStation.sushiStationHeatOfTheEastWind",
  name: "Sushi Station - Heat of the East Wind",
  run: async ({ token, args: [shouldCook, mergeAboveHotew] }) => {
    log("ensuring tiers are visible");

    const visibility = await backendCommand.isVisibleParallel(
      { tiersOn: SUSHI_TIERS_ON, tiersOff: SUSHI_TIERS_OFF },
      undefined,
      token
    );

    const tiersOff = visibility.tiersOff ?? [];

    if (tiersOff.length > 0) {
      log("tiers off, clicking to enable");
      await backendCommand.click(tiersOff[0]!, undefined, token);
      const confirm = await backendCommand.isVisible(
        SUSHI_TIERS_ON,
        undefined,
        token
      );
      if (confirm.length === 0) {
        log("failed to enable tiers");
        return;
      }
      log("tiers enabled");
    }

    const regions = buildSushiRegions();

    log("calibrating available cells");

    const slotMatches = await backendCommand.isVisibleParallel(
      { normal: GRID_SLOT, red: GRID_SLOT_RED, yellow: GRID_SLOT_YELLOW },
      undefined,
      token
    );

    const calibrationScan = await backendCommand.readRegions(
      regions,
      { ...SUSHI_HSV_LOWER },
      { ...SUSHI_HSV_UPPER },
      SUSHI_TEMPLATES,
      undefined,
      token
    );

    const availableCells = new Set<number>();

    for (const point of slotMatches.normal ?? []) {
      const cell = pointToCellIndex(point);
      if (cell !== null) {
        availableCells.add(cell);
      }
    }
    for (const point of slotMatches.red ?? []) {
      const cell = pointToCellIndex(point);
      if (cell !== null) {
        availableCells.add(cell);
      }
    }
    for (const point of slotMatches.yellow ?? []) {
      const cell = pointToCellIndex(point);
      if (cell !== null) {
        availableCells.add(cell);
      }
    }
    for (const result of calibrationScan.results) {
      if (result.match !== null) {
        availableCells.add(result.regionIndex);
      }
    }

    const priorityCells = getPriorityCells(availableCells);

    log(
      `calibrated ${availableCells.size} available cells (normal ${slotMatches.normal?.length ?? 0}, red ${slotMatches.red?.length ?? 0}, yellow ${slotMatches.yellow?.length ?? 0}, occupied ${calibrationScan.results.filter((r) => r.match !== null).length})`
    );

    if (availableCells.size === 0) {
      log("no available cells, aborting");
      return;
    }

    const scanBoard = async (): Promise<CellTier[]> => {
      token.throwIfCancelled();
      const response = await backendCommand.readRegions(
        regions,
        { ...SUSHI_HSV_LOWER },
        { ...SUSHI_HSV_UPPER },
        SUSHI_TEMPLATES,
        undefined,
        token
      );
      return buildBoardFromResults(response.results);
    };

    const executeMerge = async (
      fromCell: number,
      toCell: number,
      mergeTier: number,
      preBoard: CellTier[]
    ): Promise<void> => {
      const detectedHighest = getHighestTier(preBoard);
      const buffCap = detectedHighest === null ? 0 : detectedHighest - 6;
      const { cascade, postBoard } = simulateMerge(
        preBoard,
        fromCell,
        toCell,
        mergeTier,
        buffCap
      );
      const resultTier = mergeTier + 1;

      log(
        `merge: T${mergeTier} ${formatCell(fromCell)} -> ${formatCell(toCell)} (result T${resultTier})`
      );
      const triggerWord = cascade.length === 1 ? "trigger" : "triggers";
      log(`predicted cascade: ${cascade.length} ${triggerWord}`);
      for (const step of cascade) {
        log(
          `  ${formatCell(step.cell)} T${step.tierBefore} -> T${step.tierAfter}`
        );
      }
      logBoardGrid(log, "expected board:", postBoard, availableCells);

      token.throwIfCancelled();
      await backendCommand.drag(
        cellToPoint(fromCell),
        cellToPoint(toCell),
        SUSHI_DRAG_OPTIONS,
        token
      );
      await delay(computeMergeWaitMs(cascade.length), token);

      const actualBoard = await scanBoard();
      logBoardGrid(log, "actual board:", actualBoard, availableCells);
      verifyMergeOutcome(
        fromCell,
        toCell,
        resultTier,
        cascade,
        preBoard,
        actualBoard,
        availableCells,
        log
      );
    };

    // Skip sort when post-merge state is already useful for the next pick:
    // - count <= 3: leftmost-pair logic finds the next pair regardless of
    //   board tidiness. count=2 leaves the new mergeTier+1 pair at the
    //   original staircase slot + merge-to cell (non-adjacent, but cascade
    //   walks from to+1 rightward and is unaffected by holes left at r0's
    //   right edge). count=3 cascade promotes the descending staircase,
    //   leaving mergeTier+1 with count=3 already in priority order.
    // - isOutOfHotew: no cascade fires; only from/to changed, so the rest
    //   of the board is untouched.
    // - isFloorFallback: cluster's right neighbor is another T_floor piece,
    //   so cascade breaks at <=1 trigger. Post-merge has minimal disruption
    //   (gap at from-cell, promotions at to and to+1) and the next drain
    //   on T_floor+1 still picks a valid leftmost-pair on the unsorted
    //   board.
    const mergeAndMaybeSort = async (params: {
      preBoard: CellTier[];
      fromCell: number;
      toCell: number;
      mergeTier: number;
      count: number;
      isFloorFallback: boolean;
    }): Promise<void> => {
      const { preBoard, fromCell, toCell, mergeTier, count, isFloorFallback } =
        params;
      const highest = getHighestTier(preBoard);
      const buffCap = highest === null ? 0 : highest - 6;
      const isOutOfHotew = mergeTier > buffCap;

      await executeMerge(fromCell, toCell, mergeTier, preBoard);

      if (count <= 3) {
        log(`T${mergeTier} had count=${count}, skipping sort`);
      } else if (isOutOfHotew) {
        log(`T${mergeTier} above HOTEW (no cascade), skipping sort`);
      } else if (isFloorFallback) {
        log(`T${mergeTier} drained as T_floor fallback, skipping sort`);
      } else {
        log("sorting after merge");
        const sortResult = await runPlannedSort(
          regions,
          availableCells,
          priorityCells,
          token
        );
        log(`sort complete (${sortResult.drags} drags)`);
      }
    };

    while (true) {
      token.throwIfCancelled();

      const sortResult = await runPlannedSort(
        regions,
        availableCells,
        priorityCells,
        token
      );
      log(`sort complete (${sortResult.drags} drags)`);

      const board = await scanBoard();

      log(`lowest tier: ${formatTierOrNone(getLowestTier(board))}`);
      log(
        `highest tier with 2+: ${formatTierOrNone(getHighestTierWithCount(board, 2))}`
      );
      logBoardGrid(log, "board:", board, availableCells);
      log(
        `highest tier with 3+: ${formatTierOrNone(getHighestTierWithCount(board, 3))}`
      );
      log(
        `lowest tier with 3+: ${formatTierOrNone(getLowestTierWithCount(board, 3))}`
      );

      // Phase 2: drain merges loop
      log("phase 2: drain merges");
      let drainMerges = 0;
      // HOTEW cascades only promote tiers upward, so within one drain
      // session candidates should never drop below an already-merged tier.
      // A downward drop means the staircase is consolidated; yield to
      // cook -> spawn -> seed instead of polluting the working area.
      let drainMinTier: number | null = null;
      while (true) {
        token.throwIfCancelled();
        const drainBoard = await scanBoard();
        const lowestTier = getLowestTier(drainBoard);
        if (lowestTier === null) {
          log("board empty, ending drain");
          break;
        }
        const drainFloor = lowestTier + 1;

        const drainHighest = getHighestTier(drainBoard);
        const drainBuffCap = drainHighest === null ? null : drainHighest - 6;

        const aboveFloor = drainBoard.filter((p) => p.tierNumber > drainFloor);
        const eligible = aboveFloor.filter((p) => {
          if (p.tierNumber === MAX_TEMPLATE_TIER) {
            return false;
          }
          if (
            !mergeAboveHotew &&
            drainBuffCap !== null &&
            p.tierNumber > drainBuffCap
          ) {
            return false;
          }
          return true;
        });

        const filteredHardCap = aboveFloor.some(
          (p) => p.tierNumber === MAX_TEMPLATE_TIER
        );
        const filteredAboveBand =
          !mergeAboveHotew &&
          drainBuffCap !== null &&
          aboveFloor.some(
            (p) =>
              p.tierNumber > drainBuffCap && p.tierNumber !== MAX_TEMPLATE_TIER
          );
        if (filteredHardCap) {
          log(`excluding T${MAX_TEMPLATE_TIER} hard cap (defensive)`);
        }
        if (filteredAboveBand) {
          log(
            `excluding tiers above buffCap T${drainBuffCap} (mergeAboveHotew=false)`
          );
        }

        let candidateTier = getHighestTierWithCount(eligible, 2);

        // Fallback: drain T_floor itself only when nothing above is
        // eligible AND it has count >= 3. Below 3, the cascade fires only
        // 1 trigger and leaves <2 floor pieces behind, breaking the chain
        // for the next iteration's seed.
        let isFloorFallback = false;
        if (candidateTier === null && drainFloor !== MAX_TEMPLATE_TIER) {
          const floorCount = drainBoard.filter(
            (p) => p.tierNumber === drainFloor
          ).length;
          if (floorCount >= 3) {
            candidateTier = drainFloor;
            isFloorFallback = true;
            log(
              `no candidate above T${drainFloor}; draining T${drainFloor} (count=${floorCount})`
            );
          }
        }

        if (candidateTier === null) {
          log("no eligible drain target, exiting drain loop");
          break;
        }

        if (drainMinTier !== null && candidateTier < drainMinTier) {
          log(
            `drain candidate T${candidateTier} below session min T${drainMinTier}; exiting drain (staircase consolidated)`
          );
          break;
        }

        const sortedAsc = drainBoard
          .filter((p) => p.tierNumber === candidateTier)
          .sort((a, b) => a.cell - b.cell);
        const fromCell = sortedAsc[0]!.cell;
        const toCell = sortedAsc[1]!.cell;

        await mergeAndMaybeSort({
          preBoard: drainBoard,
          fromCell,
          toCell,
          mergeTier: candidateTier,
          count: sortedAsc.length,
          isFloorFallback,
        });
        drainMinTier =
          drainMinTier === null
            ? candidateTier
            : Math.min(drainMinTier, candidateTier);
        drainMerges++;
      }
      log(`phase 2 complete: ${drainMerges} drain merges`);

      // Phase 3: cook (gated by checkbox)
      log("phase 3: cook check");
      const cookBoard = await scanBoard();
      const emptyCount = countEmpty(cookBoard, availableCells);
      if (emptyCount === 0) {
        log("board full, no spawn needed");
      } else if (shouldCook) {
        const cookButton = await backendCommand.isVisible(
          SUSHI_COOK,
          undefined,
          token
        );
        if (cookButton.length === 0) {
          log("cook button not visible, skipping spawn");
        } else {
          log(`${emptyCount} empty cells, cooking ${emptyCount} sushi`);
          await backendCommand.click(
            cookButton[0]!,
            { ...SUSHI_CLICK_OPTIONS, times: emptyCount },
            token
          );
          await delay(COOK_DELAY_MS, token);
        }
      } else {
        log(`${emptyCount} empty cells, cook disabled, skipping spawn`);
      }

      // Phase 4: post-cook sort
      log("phase 4: post-cook sort");
      const postCookSortResult = await runPlannedSort(
        regions,
        availableCells,
        priorityCells,
        token
      );
      log(`sort complete (${postCookSortResult.drags} drags)`);

      // Phase 5: seed merge (one-shot, prepares lowestTier+1 for next run)
      log("phase 5: seed check");
      const seedBoard = await scanBoard();
      const seedLowest = getLowestTier(seedBoard);
      if (seedLowest === null) {
        log("board empty, skipping seed");
      } else {
        const seedTarget = seedLowest + 1;
        const seedTargetCount = seedBoard.filter(
          (p) => p.tierNumber === seedTarget
        ).length;
        if (seedTargetCount >= 3) {
          log(`T${seedTarget} already has ${seedTargetCount}, skipping seed`);
        } else {
          log(
            `T${seedTarget} has ${seedTargetCount} (need 3+), merging T${seedLowest} pair`
          );
          const lowestPieces = seedBoard
            .filter((p) => p.tierNumber === seedLowest)
            .sort((a, b) => a.cell - b.cell);
          if (lowestPieces.length < 2) {
            log(
              `cannot seed: T${seedLowest} has only ${lowestPieces.length} pieces`
            );
          } else {
            await mergeAndMaybeSort({
              preBoard: seedBoard,
              fromCell: lowestPieces[0]!.cell,
              toCell: lowestPieces[1]!.cell,
              mergeTier: seedLowest,
              count: lowestPieces.length,
              isFloorFallback: false,
            });
          }
        }
      }

      // Phase 6: final board log
      const finalBoard = await scanBoard();
      logBoardGrid(log, "final board:", finalBoard, availableCells);
    }
  },
});
