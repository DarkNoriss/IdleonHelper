import {
  backendCommand,
  getClickOptionsFromPreset,
  getDragOptionsFromPreset,
  type Rect,
} from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
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
  pickSortMove,
  simulateMerge,
  verifyMergeOutcome,
} from "./sushi-station-board";
import {
  buildSushiRegions,
  GRID_SLOT,
  GRID_SLOT_RED,
  GRID_SLOT_YELLOW,
  getPriorityCells,
  pointToCellIndex,
  SUSHI_COOK,
  SUSHI_HSV_LOWER,
  SUSHI_HSV_UPPER,
  SUSHI_TEMPLATES,
  SUSHI_TIERS_OFF,
  SUSHI_TIERS_ON,
} from "./sushi-station-constants";

const SETTLE_DELAY_MS = 1250;
const MERGE_BASE_DELAY_MS = 1250;
const MERGE_TRIGGER_INCREMENT_MS = 250;
const COOK_DELAY_MS = 1250;

const computeMergeWaitMs = (triggers: number): number =>
  MERGE_BASE_DELAY_MS + MERGE_TRIGGER_INCREMENT_MS * triggers;

const log = (msg: string): void =>
  logger.log(`sushi-station-hotew-v2 - ${msg}`);

const formatTierOrNone = (tier: number | null): string =>
  tier === null ? "none" : `T${tier}`;

const runSortDrain = async (
  regions: Rect[],
  priorityCells: number[],
  token: CancellationToken
): Promise<number> => {
  let drags = 0;
  while (true) {
    token.throwIfCancelled();
    const response = await backendCommand.readRegions(
      regions,
      { ...SUSHI_HSV_LOWER },
      { ...SUSHI_HSV_UPPER },
      SUSHI_TEMPLATES,
      undefined,
      token
    );
    const board = buildBoardFromResults(response.results);
    const move = pickSortMove(board, priorityCells);
    if (!move) {
      break;
    }
    token.throwIfCancelled();
    const dragOptions = getDragOptionsFromPreset("16x", true);
    await backendCommand.drag(move.from, move.to, dragOptions, token);
    drags++;
  }
  return drags;
};

export default defineScript<[boolean]>({
  id: "world7.sushiStation.sushiStationHotewV2",
  name: "Sushi Station - HOTEW v2",
  run: async ({ token, args: [shouldCook] }) => {
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
      const dragOptions = getDragOptionsFromPreset("16x", true);
      await backendCommand.drag(
        cellToPoint(fromCell),
        cellToPoint(toCell),
        dragOptions,
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

    // Outer loop intentional: removing the trailing break flips this script
    // from one-shot scout to continuous loop without restructuring.
    while (true) {
      token.throwIfCancelled();

      const sortDrags = await runSortDrain(regions, priorityCells, token);
      log(`sort complete (${sortDrags} drags)`);

      log(`scouting board after ${SETTLE_DELAY_MS}ms settle`);
      await delay(SETTLE_DELAY_MS, token);

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
      while (true) {
        token.throwIfCancelled();
        const drainBoard = await scanBoard();
        const lowestTier = getLowestTier(drainBoard);
        if (lowestTier === null) {
          log("board empty, ending drain");
          break;
        }
        const drainFloor = lowestTier + 1;

        const aboveFloor = drainBoard.filter((p) => p.tierNumber > drainFloor);
        const candidateTier = getHighestTierWithCount(aboveFloor, 2);
        if (candidateTier === null) {
          log("no eligible drain target, exiting drain loop");
          break;
        }

        const sortedAsc = aboveFloor
          .filter((p) => p.tierNumber === candidateTier)
          .sort((a, b) => a.cell - b.cell);
        const fromCell = sortedAsc[0]!.cell;
        const toCell = sortedAsc[1]!.cell;

        await executeMerge(fromCell, toCell, candidateTier, drainBoard);
        drainMerges++;

        log("sorting after drain merge");
        const drainSortDrags = await runSortDrain(
          regions,
          priorityCells,
          token
        );
        log(`sort complete (${drainSortDrags} drags)`);
      }
      log(`phase 2 complete: ${drainMerges} drain merges`);

      // Phase 3: seed merge (one-shot)
      log("phase 3: seed check");
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
            const fromCell = lowestPieces[0]!.cell;
            const toCell = lowestPieces[1]!.cell;
            await executeMerge(fromCell, toCell, seedLowest, seedBoard);
            log("sorting after seed merge");
            const seedSortDrags = await runSortDrain(
              regions,
              priorityCells,
              token
            );
            log(`sort complete (${seedSortDrags} drags)`);
          }
        }
      }

      // Phase 4: cook (gated by checkbox)
      log("phase 4: cook check");
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
          const clickOptions = getClickOptionsFromPreset("16x");
          await backendCommand.click(
            cookButton[0]!,
            { ...clickOptions, times: emptyCount },
            token
          );
          await delay(COOK_DELAY_MS, token);
        }
      } else {
        log(`${emptyCount} empty cells, cook disabled, skipping spawn`);
      }

      // Phase 5: final sort
      log("phase 5: final sort");
      const finalSortDrags = await runSortDrain(regions, priorityCells, token);
      log(`sort complete (${finalSortDrags} drags)`);

      // Phase 6: final board log
      const finalBoard = await scanBoard();
      logBoardGrid(log, "final board:", finalBoard, availableCells);

      break;
    }
  },
});
