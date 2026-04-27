import {
  backendCommand,
  getDragOptionsFromPreset,
} from "../../../backend/index";
import { delay, logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  buildBoardFromResults,
  getHighestTierWithCount,
  getLowestTier,
  getLowestTierWithCount,
  logBoardGrid,
  pickSortMove,
} from "./sushi-station-board";
import {
  buildSushiRegions,
  GRID_SLOT,
  GRID_SLOT_RED,
  GRID_SLOT_YELLOW,
  getPriorityCells,
  pointToCellIndex,
  SUSHI_HSV_LOWER,
  SUSHI_HSV_UPPER,
  SUSHI_TEMPLATES,
  SUSHI_TIERS_OFF,
  SUSHI_TIERS_ON,
} from "./sushi-station-constants";

const SETTLE_DELAY_MS = 1250;

const log = (msg: string): void =>
  logger.log(`sushi-station-hotew-v2 - ${msg}`);

const formatTierOrNone = (tier: number | null): string =>
  tier === null ? "none" : `T${tier}`;

export default defineScript({
  id: "world7.sushiStation.sushiStationHotewV2",
  name: "Sushi Station - HOTEW v2 (Scout)",
  run: async ({ token }) => {
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

    while (true) {
      token.throwIfCancelled();

      let drags = 0;
      while (true) {
        token.throwIfCancelled();
        const sortScan = await backendCommand.readRegions(
          regions,
          { ...SUSHI_HSV_LOWER },
          { ...SUSHI_HSV_UPPER },
          SUSHI_TEMPLATES,
          undefined,
          token
        );
        const sortBoard = buildBoardFromResults(sortScan.results);
        const move = pickSortMove(sortBoard, priorityCells);
        if (!move) {
          break;
        }
        token.throwIfCancelled();
        const dragOptions = getDragOptionsFromPreset("16x", true);
        await backendCommand.drag(move.from, move.to, dragOptions, token);
        drags++;
      }
      log(`sort complete (${drags} drags)`);

      log(`scouting board after ${SETTLE_DELAY_MS}ms settle`);
      await delay(SETTLE_DELAY_MS, token);

      const scoutScan = await backendCommand.readRegions(
        regions,
        { ...SUSHI_HSV_LOWER },
        { ...SUSHI_HSV_UPPER },
        SUSHI_TEMPLATES,
        undefined,
        token
      );
      const board = buildBoardFromResults(scoutScan.results);

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

      break;
    }
  },
});
