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
  buildCellToTier,
  type CellTier,
  cellToPoint,
  countEmpty,
  formatCell,
  getHighestTier,
  logBoardGrid,
  type MergePlan,
  pickSortMove,
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
import { computeMergeWaitMs, planBestMerge } from "./sushi-station-planner";

const PHASE_DELAY_MS = 1000;

const logMergePlan = (plan: MergePlan): void => {
  const sourceLabel = plan.cascadeFired ? "buff-firing" : "no buff";
  logger.log(
    `sushi-station-max-buff - chosen merge (${sourceLabel}): T${plan.mergeTier} ${formatCell(plan.fromCell)} -> ${formatCell(plan.toCell)} (result T${plan.resultTier})`
  );
  const triggerWord = plan.cascade.length === 1 ? "trigger" : "triggers";
  logger.log(
    `sushi-station-max-buff - predicted cascade: ${plan.cascade.length} ${triggerWord}`
  );
  for (const step of plan.cascade) {
    logger.log(
      `sushi-station-max-buff -   ${formatCell(step.cell)} T${step.tierBefore} -> T${step.tierAfter}`
    );
  }
};

const verifyMerge = (
  plan: MergePlan,
  preMergeBoard: CellTier[],
  actualBoard: CellTier[],
  availableCells: ReadonlySet<number>
): void => {
  const preCellToTier = buildCellToTier(preMergeBoard);
  const postCellToTier = buildCellToTier(actualBoard);

  const formatActual = (tier: number | undefined): string =>
    tier === undefined ? "empty" : `T${tier}`;

  let passes = 0;
  let total = 0;

  total++;
  const fromActual = postCellToTier.get(plan.fromCell);
  if (fromActual === undefined) {
    passes++;
  } else {
    logger.log(
      `sushi-station-max-buff -   FAIL ${formatCell(plan.fromCell)} expected empty, actual ${formatActual(fromActual)}`
    );
  }

  total++;
  const toActual = postCellToTier.get(plan.toCell);
  if (toActual === plan.resultTier) {
    passes++;
  } else {
    logger.log(
      `sushi-station-max-buff -   FAIL ${formatCell(plan.toCell)} expected T${plan.resultTier}, actual ${formatActual(toActual)}`
    );
  }

  for (const step of plan.cascade) {
    total++;
    const actual = postCellToTier.get(step.cell);
    if (actual === step.tierAfter) {
      passes++;
    } else {
      logger.log(
        `sushi-station-max-buff -   FAIL ${formatCell(step.cell)} expected T${step.tierAfter}, actual ${formatActual(actual)}`
      );
    }
  }

  const predictedCells = new Set<number>();
  predictedCells.add(plan.fromCell);
  predictedCells.add(plan.toCell);
  for (const step of plan.cascade) {
    predictedCells.add(step.cell);
  }

  let extras = 0;
  for (const cell of availableCells) {
    if (predictedCells.has(cell)) {
      continue;
    }
    const pre = preCellToTier.get(cell);
    const post = postCellToTier.get(cell);
    if (pre !== post) {
      logger.log(
        `sushi-station-max-buff -   EXTRA ${formatCell(cell)} ${formatActual(pre)} -> ${formatActual(post)} (not predicted)`
      );
      extras++;
    }
  }

  if (extras > 0) {
    const actualTriggers = plan.cascade.length + extras;
    logger.log(
      `sushi-station-max-buff - verification: ${passes}/${total} predictions match, ${extras} unpredicted (actual cascade ~${actualTriggers} triggers)`
    );
  } else {
    logger.log(
      `sushi-station-max-buff - verification: ${passes}/${total} predictions match`
    );
  }
};

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
  id: "world7.sushiStation.sushiStationMaxBuffMerge",
  name: "Sushi Station - Heat of the East Win",
  run: async ({ token, args: [shouldCook] }) => {
    logger.log(
      "sushi-station-max-buff - starting (highest tier auto-detected per iteration, X = highest - 6)"
    );

    logger.log("sushi-station-max-buff - ensuring tiers are visible");

    const visibility = await backendCommand.isVisibleParallel(
      { tiersOn: SUSHI_TIERS_ON, tiersOff: SUSHI_TIERS_OFF },
      undefined,
      token
    );

    const tiersOff = visibility.tiersOff ?? [];

    if (tiersOff.length > 0) {
      logger.log("sushi-station-max-buff - tiers off, clicking to enable");
      await backendCommand.click(tiersOff[0]!, undefined, token);
      const confirm = await backendCommand.isVisible(
        SUSHI_TIERS_ON,
        undefined,
        token
      );
      if (confirm.length === 0) {
        logger.log("sushi-station-max-buff - failed to enable tiers");
        return;
      }
      logger.log("sushi-station-max-buff - tiers enabled");
    }

    const regions = buildSushiRegions();

    logger.log("sushi-station-max-buff - calibrating available cells");

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
      `sushi-station-max-buff - calibrated ${availableCells.size} available cells (normal ${slotMatches.normal?.length ?? 0}, red ${slotMatches.red?.length ?? 0}, yellow ${slotMatches.yellow?.length ?? 0}, occupied ${calibrationScan.results.filter((r) => r.match !== null).length})`
    );

    if (availableCells.size === 0) {
      logger.log("sushi-station-max-buff - no available cells, aborting");
      return;
    }

    let iteration = 0;
    while (true) {
      token.throwIfCancelled();
      iteration++;
      logger.log(`sushi-station-max-buff - iteration ${iteration}`);

      const sortDrags1 = await runSortDrain(regions, priorityCells, token);
      logger.log(
        `sushi-station-max-buff - sort phase 1 complete (${sortDrags1} drags)`
      );

      await delay(PHASE_DELAY_MS, token);

      token.throwIfCancelled();
      const censusScan = await backendCommand.readRegions(
        regions,
        { ...SUSHI_HSV_LOWER },
        { ...SUSHI_HSV_UPPER },
        SUSHI_TEMPLATES,
        undefined,
        token
      );
      const censusBoard = buildBoardFromResults(censusScan.results);
      const emptyCount = countEmpty(censusBoard, availableCells);

      if (emptyCount === 0) {
        logger.log("sushi-station-max-buff - board full, no spawn needed");
      } else if (shouldCook) {
        logger.log(
          `sushi-station-max-buff - ${emptyCount} empty cells, cooking ${emptyCount} sushi`
        );
        const cookButton = await backendCommand.isVisible(
          SUSHI_COOK,
          undefined,
          token
        );
        if (cookButton.length === 0) {
          logger.log(
            "sushi-station-max-buff - cook button not visible, skipping spawn"
          );
        } else {
          const clickOptions = getClickOptionsFromPreset("16x");
          await backendCommand.click(
            cookButton[0]!,
            { ...clickOptions, times: emptyCount },
            token
          );
          await delay(PHASE_DELAY_MS, token);
        }
      } else {
        logger.log(
          `sushi-station-max-buff - ${emptyCount} empty cells, cook disabled, skipping spawn`
        );
      }

      const sortDrags2 = await runSortDrain(regions, priorityCells, token);
      logger.log(
        `sushi-station-max-buff - sort phase 2 complete (${sortDrags2} drags)`
      );

      await delay(PHASE_DELAY_MS, token);

      token.throwIfCancelled();
      const preMergeScan = await backendCommand.readRegions(
        regions,
        { ...SUSHI_HSV_LOWER },
        { ...SUSHI_HSV_UPPER },
        SUSHI_TEMPLATES,
        undefined,
        token
      );
      const preMergeBoard = buildBoardFromResults(preMergeScan.results);

      logBoardGrid(
        (msg) => logger.log(`sushi-station-max-buff - ${msg}`),
        "board before merge",
        preMergeBoard,
        availableCells
      );

      const detectedHighest = getHighestTier(preMergeBoard);
      if (detectedHighest === null) {
        logger.log(
          "sushi-station-max-buff - board empty, no merge available, exiting"
        );
        break;
      }
      const buffCap = detectedHighest - 6;
      logger.log(
        `sushi-station-max-buff - detected highest T${detectedHighest}, buff cap T${buffCap}${buffCap < 1 ? " (buff inactive)" : ""}`
      );

      const plan = planBestMerge(preMergeBoard, buffCap);
      if (!plan) {
        logger.log(
          "sushi-station-max-buff - no merge available (no tier has a forward-drag pair), exiting"
        );
        break;
      }

      logMergePlan(plan);

      logger.log(
        `sushi-station-max-buff - executing merge T${plan.mergeTier} ${formatCell(plan.fromCell)} -> ${formatCell(plan.toCell)}`
      );
      token.throwIfCancelled();
      const mergeDragOptions = getDragOptionsFromPreset("16x", true);
      await backendCommand.drag(
        cellToPoint(plan.fromCell),
        cellToPoint(plan.toCell),
        mergeDragOptions,
        token
      );

      const totalWaitMs = computeMergeWaitMs(plan.cascade.length);
      await delay(totalWaitMs, token);

      token.throwIfCancelled();
      const postMergeScan = await backendCommand.readRegions(
        regions,
        { ...SUSHI_HSV_LOWER },
        { ...SUSHI_HSV_UPPER },
        SUSHI_TEMPLATES,
        undefined,
        token
      );
      const postMergeBoard = buildBoardFromResults(postMergeScan.results);

      logBoardGrid(
        (msg) => logger.log(`sushi-station-max-buff - ${msg}`),
        "board after merge",
        postMergeBoard,
        availableCells
      );

      verifyMerge(plan, preMergeBoard, postMergeBoard, availableCells);
    }

    logger.log(
      `sushi-station-max-buff - loop ended after ${iteration} iterations`
    );
  },
});
