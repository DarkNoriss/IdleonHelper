import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  buildBoardFromResults,
  isBoardSorted,
  logBoardGrid,
  planSortDrags,
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
  SUSHI_SORT_DRAG_OPTIONS,
  SUSHI_TEMPLATES,
  SUSHI_TIERS_OFF,
  SUSHI_TIERS_ON,
} from "./sushi-station-constants";

const log = (msg: string): void => logger.log(`sushi-station-sort - ${msg}`);

export default defineScript({
  id: "world7.sushiStation.sushiStationSort",
  name: "Sushi Station - Sort",
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

    log(`calibrated ${availableCells.size} available cells`);

    if (availableCells.size === 0) {
      log("no available cells, aborting");
      return;
    }

    token.throwIfCancelled();
    const preResponse = await backendCommand.readRegions(
      regions,
      { ...SUSHI_HSV_LOWER },
      { ...SUSHI_HSV_UPPER },
      SUSHI_TEMPLATES,
      undefined,
      token
    );
    const preBoard = buildBoardFromResults(preResponse.results);
    logBoardGrid(log, "board before sort", preBoard, availableCells);
    log(`pre-sort piece count: ${preBoard.length}`);

    if (isBoardSorted(preBoard, priorityCells)) {
      log("board is already sorted, nothing to do");
      return;
    }

    const moves = planSortDrags(preBoard, priorityCells, availableCells);
    log(`planned ${moves.length} drags`);

    if (moves.length === 0) {
      log(
        "WARNING: planner emitted 0 drags but board is not sorted - aborting"
      );
      return;
    }

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i]!;
      log(
        `drag #${i + 1}: ${move.tier} [${move.fromRow},${move.fromCol}] -> [${move.toRow},${move.toCol}]`
      );
      token.throwIfCancelled();
      await backendCommand.drag(
        move.from,
        move.to,
        SUSHI_SORT_DRAG_OPTIONS,
        token
      );
    }

    token.throwIfCancelled();
    const postResponse = await backendCommand.readRegions(
      regions,
      { ...SUSHI_HSV_LOWER },
      { ...SUSHI_HSV_UPPER },
      SUSHI_TEMPLATES,
      undefined,
      token
    );
    const postBoard = buildBoardFromResults(postResponse.results);
    logBoardGrid(log, "board after sort", postBoard, availableCells);
    log(`post-sort piece count: ${postBoard.length}`);

    if (postBoard.length !== preBoard.length) {
      log(
        `WARNING: piece count changed (${preBoard.length} -> ${postBoard.length}), sort caused merges`
      );
    }

    if (isBoardSorted(postBoard, priorityCells)) {
      log("verification: board is sorted");
    } else {
      const remaining = planSortDrags(postBoard, priorityCells, availableCells);
      log(
        `verification: board NOT sorted, ${remaining.length} drags planned for next pass`
      );
    }

    log(`sort complete (${moves.length} drags)`);
  },
});
