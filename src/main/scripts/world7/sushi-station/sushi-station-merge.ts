import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  buildBoardFromResults,
  cellToPoint,
  pickSortMove,
} from "./sushi-station-board";
import {
  buildSushiRegions,
  countEmptyCells,
  GRID_SLOT,
  GRID_SLOT_RED,
  GRID_SLOT_YELLOW,
  getPriorityCells,
  pointToCellIndex,
  SUSHI_CLICK_OPTIONS,
  SUSHI_COOK,
  SUSHI_DRAG_OPTIONS,
  SUSHI_GRID,
  SUSHI_HSV_LOWER,
  SUSHI_HSV_UPPER,
  SUSHI_TEMPLATES,
  SUSHI_TIERS_OFF,
  SUSHI_TIERS_ON,
} from "./sushi-station-constants";

export default defineScript<[boolean]>({
  id: "world7.sushiStation.sushiStationMerge",
  name: "Sushi Station - Merge",
  run: async ({ token, args: [shouldCook] }) => {
    logger.log("sushi-station-merge - ensuring tiers are visible");

    const visibility = await backendCommand.isVisibleParallel(
      { tiersOn: SUSHI_TIERS_ON, tiersOff: SUSHI_TIERS_OFF },
      undefined,
      token
    );

    const tiersOff = visibility.tiersOff ?? [];

    if (tiersOff.length > 0) {
      logger.log("sushi-station-merge - tiers off, clicking to enable");
      await backendCommand.click(tiersOff[0]!, undefined, token);
      const confirm = await backendCommand.isVisible(
        SUSHI_TIERS_ON,
        undefined,
        token
      );
      if (confirm.length === 0) {
        logger.log("sushi-station-merge - failed to enable tiers");
        return;
      }
      logger.log("sushi-station-merge - tiers enabled");
    }

    const regions = buildSushiRegions();

    logger.log("sushi-station-merge - calibrating available cells");

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

    logger.log(
      `sushi-station-merge - calibrated ${availableCells.size} available cells (normal ${slotMatches.normal?.length ?? 0}, red ${slotMatches.red?.length ?? 0}, yellow ${slotMatches.yellow?.length ?? 0}, occupied ${calibrationScan.results.filter((r) => r.match !== null).length})`
    );

    if (availableCells.size === 0) {
      logger.log("sushi-station-merge - no available cells, aborting");
      return;
    }

    logger.log("sushi-station-merge - starting continuous merge loop");

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

      const grouped = new Map<string, number[]>();
      for (const result of response.results) {
        if (result.match === null) {
          continue;
        }
        const indices = grouped.get(result.match);
        if (indices) {
          indices.push(result.regionIndex);
        } else {
          grouped.set(result.match, [result.regionIndex]);
        }
      }

      const hardCapTemplate = SUSHI_TEMPLATES.at(-1)!;

      let actedThisIteration = false;
      for (const [tier, indices] of grouped) {
        if (indices.length < 2) {
          continue;
        }
        if (tier === hardCapTemplate) {
          logger.log(
            `sushi-station-merge - skipping ${tier} hard cap (defensive)`
          );
          continue;
        }

        const from = cellToPoint(indices[0]!);
        const to = cellToPoint(indices[1]!);
        const fromCol = indices[0]! % SUSHI_GRID.COLUMNS;
        const fromRow = Math.floor(indices[0]! / SUSHI_GRID.COLUMNS);
        const toCol = indices[1]! % SUSHI_GRID.COLUMNS;
        const toRow = Math.floor(indices[1]! / SUSHI_GRID.COLUMNS);

        logger.log(
          `sushi-station-merge - merging ${tier} [${fromRow},${fromCol}] -> [${toRow},${toCol}]`
        );

        token.throwIfCancelled();
        await backendCommand.drag(from, to, SUSHI_DRAG_OPTIONS, token);
        actedThisIteration = true;
        break;
      }

      if (!actedThisIteration) {
        const board = buildBoardFromResults(response.results);
        const move = pickSortMove(board, priorityCells);
        if (move) {
          logger.log(
            `sushi-station-merge - sorting ${move.tier} [${move.fromRow},${move.fromCol}] -> [${move.toRow},${move.toCol}]`
          );
          token.throwIfCancelled();
          await backendCommand.drag(
            move.from,
            move.to,
            SUSHI_DRAG_OPTIONS,
            token
          );
          actedThisIteration = true;
        }
      }

      if (!actedThisIteration && shouldCook) {
        const emptyCount = countEmptyCells(response.results, availableCells);
        if (emptyCount > 0) {
          logger.log(
            `sushi-station-merge - no pairs, cooking ${emptyCount} sushi`
          );
          const cookButton = await backendCommand.isVisible(
            SUSHI_COOK,
            undefined,
            token
          );
          if (cookButton.length > 0) {
            await backendCommand.click(
              cookButton[0]!,
              { ...SUSHI_CLICK_OPTIONS, times: emptyCount },
              token
            );
          }
        }
      }
    }
  },
});
