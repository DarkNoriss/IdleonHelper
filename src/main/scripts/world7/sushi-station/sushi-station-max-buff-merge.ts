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
  MAX_TEMPLATE_TIER,
  pointToCellIndex,
  SUSHI_COOK,
  SUSHI_HSV_LOWER,
  SUSHI_HSV_UPPER,
  SUSHI_TEMPLATES,
  SUSHI_TIERS_OFF,
  SUSHI_TIERS_ON,
} from "./sushi-station-constants";
import {
  computeMergeWaitMs,
  planCleanupMerge,
  planNextMerge,
  planUnlockMerge,
} from "./sushi-station-planner";

const PHASE_DELAY_MS = 1000;

const log = (msg: string): void =>
  logger.log(`sushi-station-max-buff - ${msg}`);

const logMergePlan = (plan: MergePlan): void => {
  const sourceLabel = plan.cascadeFired ? "buff-firing" : "no buff";
  log(
    `chosen merge (${sourceLabel}): T${plan.mergeTier} ${formatCell(plan.fromCell)} -> ${formatCell(plan.toCell)} (result T${plan.resultTier})`
  );
  const triggerWord = plan.cascade.length === 1 ? "trigger" : "triggers";
  log(`predicted cascade: ${plan.cascade.length} ${triggerWord}`);
  for (const step of plan.cascade) {
    log(`  ${formatCell(step.cell)} T${step.tierBefore} -> T${step.tierAfter}`);
  }
};

const logCleanupPlan = (plan: MergePlan): void => {
  log(
    `cleanup merge: T${plan.mergeTier} ${formatCell(plan.fromCell)} -> ${formatCell(plan.toCell)} (lifts T${plan.resultTier} count toward 3+)`
  );
  if (plan.cascade.length > 0) {
    const triggerWord = plan.cascade.length === 1 ? "trigger" : "triggers";
    log(`cleanup cascade: ${plan.cascade.length} ${triggerWord}`);
    for (const step of plan.cascade) {
      log(
        `  ${formatCell(step.cell)} T${step.tierBefore} -> T${step.tierAfter}`
      );
    }
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
    log(
      `  FAIL ${formatCell(plan.fromCell)} expected empty, actual ${formatActual(fromActual)}`
    );
  }

  total++;
  const toActual = postCellToTier.get(plan.toCell);
  if (toActual === plan.resultTier) {
    passes++;
  } else {
    log(
      `  FAIL ${formatCell(plan.toCell)} expected T${plan.resultTier}, actual ${formatActual(toActual)}`
    );
  }

  for (const step of plan.cascade) {
    total++;
    const actual = postCellToTier.get(step.cell);
    if (actual === step.tierAfter) {
      passes++;
    } else {
      log(
        `  FAIL ${formatCell(step.cell)} expected T${step.tierAfter}, actual ${formatActual(actual)}`
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
      log(
        `  EXTRA ${formatCell(cell)} ${formatActual(pre)} -> ${formatActual(post)} (not predicted)`
      );
      extras++;
    }
  }

  if (extras > 0) {
    const actualTriggers = plan.cascade.length + extras;
    log(
      `verification: ${passes}/${total} predictions match, ${extras} unpredicted (actual cascade ~${actualTriggers} triggers)`
    );
  } else {
    log(`verification: ${passes}/${total} predictions match`);
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
    log(
      "starting (strict 3+ in HOTEW range, X = highest - 6, cleanup as fallback)"
    );

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

    const sortPhase = async (): Promise<void> => {
      const drags = await runSortDrain(regions, priorityCells, token);
      log(`sort complete (${drags} drags)`);
      await delay(PHASE_DELAY_MS, token);
    };

    const cookPhase = async (): Promise<void> => {
      const board = await scanBoard();
      const emptyCount = countEmpty(board, availableCells);

      if (emptyCount === 0) {
        log("board full, no spawn needed");
        return;
      }
      if (!shouldCook) {
        log(`${emptyCount} empty cells, cook disabled, skipping spawn`);
        return;
      }
      log(`${emptyCount} empty cells, cooking ${emptyCount} sushi`);
      const cookButton = await backendCommand.isVisible(
        SUSHI_COOK,
        undefined,
        token
      );
      if (cookButton.length === 0) {
        log("cook button not visible, skipping spawn");
        return;
      }
      const clickOptions = getClickOptionsFromPreset("16x");
      await backendCommand.click(
        cookButton[0]!,
        { ...clickOptions, times: emptyCount },
        token
      );
      await delay(PHASE_DELAY_MS, token);
    };

    const executeMerge = async (plan: MergePlan): Promise<void> => {
      log(
        `executing merge T${plan.mergeTier} ${formatCell(plan.fromCell)} -> ${formatCell(plan.toCell)}`
      );
      token.throwIfCancelled();
      const dragOptions = getDragOptionsFromPreset("16x", true);
      await backendCommand.drag(
        cellToPoint(plan.fromCell),
        cellToPoint(plan.toCell),
        dragOptions,
        token
      );
      await delay(computeMergeWaitMs(plan.cascade.length), token);
    };

    let iteration = 0;
    while (true) {
      token.throwIfCancelled();
      iteration++;
      log(`iteration ${iteration}`);

      await cookPhase();
      await sortPhase();

      // Inner merge train: keep merging while a tier in HOTEW range has 3+
      // pieces. No sort or cook between climb merges - that is the speed
      // win. Cleanup is a fallback only: when no 3+ tier exists, lift a
      // 2-piece tier so the next iteration has something to climb.
      let mergesInTrain = 0;
      while (true) {
        token.throwIfCancelled();
        const preMergeBoard = await scanBoard();
        logBoardGrid(log, "board before merge", preMergeBoard, availableCells);

        const detectedHighest = getHighestTier(preMergeBoard);
        if (detectedHighest === null) {
          log("board empty, ending train");
          break;
        }
        const buffCap = detectedHighest - 6;
        log(
          `detected highest T${detectedHighest}, buff cap T${buffCap}${buffCap < 1 ? " (buff inactive)" : ""}`
        );

        const plan = planNextMerge(preMergeBoard, buffCap);
        if (plan) {
          logMergePlan(plan);
          await executeMerge(plan);
          mergesInTrain++;

          const postMergeBoard = await scanBoard();
          logBoardGrid(
            log,
            "board after merge",
            postMergeBoard,
            availableCells
          );
          verifyMerge(plan, preMergeBoard, postMergeBoard, availableCells);

          // Climb peaked: this merge pushed a piece above buffCap (out of
          // HOTEW range). Stop the train and let the outer loop cook+sort
          // before the next climb so we do not regress to bottom-tier
          // merges.
          if (plan.mergeTier === buffCap) {
            log(`buffCap merge complete (T${plan.mergeTier}), ending train`);
            break;
          }
          continue;
        }

        // Climb has nothing - try lifting a 2-piece tier as a fallback.
        const cleanup = planCleanupMerge(preMergeBoard, buffCap);
        if (!cleanup) {
          log("no eligible 3+ merge in HOTEW range, ending train");
          break;
        }

        logCleanupPlan(cleanup);
        await executeMerge(cleanup);
        mergesInTrain++;
        const postCleanupBoard = await scanBoard();
        logBoardGrid(
          log,
          "board after cleanup",
          postCleanupBoard,
          availableCells
        );
        verifyMerge(cleanup, preMergeBoard, postCleanupBoard, availableCells);
        await sortPhase();
      }

      log(`train complete: ${mergesInTrain} merges`);

      // End-of-train unlock pass: drain above-buffCap stockpile to push
      // the highest tier upward. No cascade fires above buffCap, so these
      // are flat 2:1 merges. Capped at MAX_TEMPLATE_TIER - 1 so results
      // stay within the recognized template set.
      log("unlock pass: starting");
      let unlockMerges = 0;
      while (true) {
        token.throwIfCancelled();
        const preBoard = await scanBoard();
        const detected = getHighestTier(preBoard);
        if (detected === null) {
          break;
        }
        const buffCap = detected - 6;

        const plan = planUnlockMerge(preBoard, buffCap, MAX_TEMPLATE_TIER - 1);
        if (!plan) {
          break;
        }

        log(
          `unlock merge: T${plan.mergeTier} ${formatCell(plan.fromCell)} -> ${formatCell(plan.toCell)} (result T${plan.resultTier})`
        );
        await executeMerge(plan);
        unlockMerges++;

        const postBoard = await scanBoard();
        logBoardGrid(
          log,
          "board after unlock merge",
          postBoard,
          availableCells
        );
        verifyMerge(plan, preBoard, postBoard, availableCells);
      }
      log(`unlock pass complete: ${unlockMerges} merges`);

      if (mergesInTrain === 0 && unlockMerges === 0) {
        log("no progress this iteration, exiting");
        break;
      }
    }

    log(`loop ended after ${iteration} iterations`);
  },
});
