import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  buildBoardFromResults,
  formatCell,
  getHighestTier,
  logBoardGrid,
} from "./sushi-station-board";
import {
  buildSushiRegions,
  GRID_SLOT,
  GRID_SLOT_RED,
  GRID_SLOT_YELLOW,
  pointToCellIndex,
  SUSHI_GRID,
  SUSHI_HSV_LOWER,
  SUSHI_HSV_UPPER,
  SUSHI_TEMPLATES,
  SUSHI_TIERS_OFF,
  SUSHI_TIERS_ON,
} from "./sushi-station-constants";
import { planNextMerge } from "./sushi-station-planner";

const log = (msg: string): void => logger.log(`sushi-station-debug - ${msg}`);

export default defineScript({
  id: "world7.sushiStation.sushiStationMergeDebug",
  name: "Sushi Station - Debug",
  run: async ({ token }) => {
    // 1. Check tiers visibility and enable if off
    logger.log("sushi-station-debug - checking tiers visibility");

    const visibility = await backendCommand.isVisibleParallel(
      { tiersOn: SUSHI_TIERS_ON, tiersOff: SUSHI_TIERS_OFF },
      undefined,
      token
    );

    const tiersOn = visibility.tiersOn ?? [];
    const tiersOff = visibility.tiersOff ?? [];

    logger.log(
      `sushi-station-debug - tiers on: ${tiersOn.length} matches, tiers off: ${tiersOff.length} matches`
    );

    if (tiersOff.length > 0) {
      logger.log("sushi-station-debug - tiers off, clicking to enable");
      await backendCommand.click(tiersOff[0]!, undefined, token);
      const confirm = await backendCommand.isVisible(
        SUSHI_TIERS_ON,
        undefined,
        token
      );
      if (confirm.length === 0) {
        logger.log("sushi-station-debug - failed to enable tiers");
        return;
      }
      logger.log("sushi-station-debug - tiers enabled");
    } else {
      logger.log("sushi-station-debug - tiers already on");
    }

    // 2. Scan grid with debug to save filtered images
    const regions = buildSushiRegions();

    logger.log(
      `sushi-station-debug - step 1: scanning ${regions.length} regions, debug=true`
    );

    const scan = await backendCommand.readRegions(
      regions,
      { ...SUSHI_HSV_LOWER },
      { ...SUSHI_HSV_UPPER },
      [],
      { debug: true },
      token
    );

    // Collect non-empty filtered images as templates
    const templates: string[] = [];
    for (const result of scan.results) {
      if (result.nonZeroPixels >= 10 && result.debugImagePath) {
        templates.push(result.debugImagePath);
        const col = result.regionIndex % SUSHI_GRID.COLUMNS;
        const row = Math.floor(result.regionIndex / SUSHI_GRID.COLUMNS);
        logger.log(
          `sushi-station-debug - [${row},${col}] pixels=${result.nonZeroPixels} -> template`
        );
      }
    }

    logger.log(
      `sushi-station-debug - found ${templates.length} non-empty cells`
    );

    if (templates.length === 0) {
      logger.log("sushi-station-debug - no sushi found, done");
      return;
    }

    // 3. Re-scan using filtered images as templates to verify uniqueness
    logger.log(
      `sushi-station-debug - step 2: verifying with ${templates.length} templates`
    );

    const verify = await backendCommand.readRegions(
      regions,
      { ...SUSHI_HSV_LOWER },
      { ...SUSHI_HSV_UPPER },
      templates,
      undefined,
      token
    );

    // Count how many cells matched each template
    const matchCounts = new Map<string, number>();
    for (const result of verify.results) {
      if (result.match === null) {
        continue;
      }
      matchCounts.set(result.match, (matchCounts.get(result.match) ?? 0) + 1);
    }

    for (const [template, count] of matchCounts) {
      logger.log(
        `sushi-station-debug - ${template}: ${count} match${count > 1 ? "es" : ""}`
      );
    }

    // 4. Board + planner debug: scan with real templates, log grid, plan a merge
    log("step 3: board + planner debug");

    const slotMatches = await backendCommand.isVisibleParallel(
      { normal: GRID_SLOT, red: GRID_SLOT_RED, yellow: GRID_SLOT_YELLOW },
      undefined,
      token
    );

    const boardScan = await backendCommand.readRegions(
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
    for (const result of boardScan.results) {
      if (result.match !== null) {
        availableCells.add(result.regionIndex);
      }
    }

    const board = buildBoardFromResults(boardScan.results);
    logBoardGrid(log, "board:", board, availableCells);

    const highest = getHighestTier(board);
    if (highest === null) {
      log("board empty, no plan");
      return;
    }
    const buffCap = highest - 6;
    log(
      `highest T${highest}, buff cap T${buffCap}${buffCap < 1 ? " (buff inactive)" : ""}`
    );

    const plan = planNextMerge(board, buffCap, true);
    if (!plan) {
      log("no eligible 3+ merge in HOTEW range");
      return;
    }

    const sourceLabel = plan.cascadeFired ? "buff-firing" : "no buff";
    log(
      `chosen merge (${sourceLabel}): T${plan.mergeTier} ${formatCell(plan.fromCell)} -> ${formatCell(plan.toCell)} (result T${plan.resultTier})`
    );
    const triggerWord = plan.cascade.length === 1 ? "trigger" : "triggers";
    log(`predicted cascade: ${plan.cascade.length} ${triggerWord}`);
    for (const step of plan.cascade) {
      log(
        `  ${formatCell(step.cell)} T${step.tierBefore} -> T${step.tierAfter}`
      );
    }
  },
});
