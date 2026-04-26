import {
  backendCommand,
  getClickOptionsFromPreset,
  getDragOptionsFromPreset,
  type Point,
  type RegionResult,
} from "../../../backend/index";
import { delay, logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  buildSushiRegions,
  GRID_SLOT,
  GRID_SLOT_RED,
  getMaxBuffPriorityCells,
  parseTierNumber,
  pointToCellIndex,
  SUSHI_COOK,
  SUSHI_GRID,
  SUSHI_HSV_LOWER,
  SUSHI_HSV_UPPER,
  SUSHI_TEMPLATES,
  SUSHI_TIERS_OFF,
  SUSHI_TIERS_ON,
} from "./sushi-station-constants";

const TOTAL_CELLS = SUSHI_GRID.ROWS * SUSHI_GRID.COLUMNS;

const PHASE_DELAY_MS = 2000;
const COOK_BATCH_SIZE = 100;
const MERGE_ANIMATION_MS_PER_TRIGGER = 2000;

// Gate: flip to true once merge + cascade animation timing is wired into the
// outer loop. While false, the loop is sort -> delay -> spawn -> delay -> repeat,
// and a one-shot analysis logs the projected best merge cascade at the end.
const PERFORM_MERGE: boolean = false;

const cellToPoint = (cellIndex: number): Point => {
  const col = cellIndex % SUSHI_GRID.COLUMNS;
  const row = Math.floor(cellIndex / SUSHI_GRID.COLUMNS);
  return {
    x: SUSHI_GRID.FIRST_POSITION.x + col * SUSHI_GRID.X_STEP,
    y: SUSHI_GRID.FIRST_POSITION.y + row * SUSHI_GRID.Y_STEP,
  };
};

type CellTier = { cell: number; tier: string; tierNumber: number };

const buildBoardFromResults = (results: RegionResult[]): CellTier[] => {
  const board: CellTier[] = [];
  for (const result of results) {
    if (result.match === null) {
      continue;
    }
    const tierNumber = parseTierNumber(result.match);
    if (tierNumber === null) {
      continue;
    }
    board.push({
      cell: result.regionIndex,
      tier: result.match,
      tierNumber,
    });
  }
  return board;
};

type SortMove = {
  from: Point;
  to: Point;
  tier: string;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
};

const pickSortMove = (
  board: CellTier[],
  priorityCells: number[]
): SortMove | null => {
  const sorted = [...board].sort((a, b) => b.tierNumber - a.tierNumber);

  for (let i = 0; i < sorted.length; i++) {
    const target = priorityCells[i];
    if (target === undefined) {
      logger.log(
        "sushi-station-max-buff - more sushi than priority cells, skipping sort"
      );
      return null;
    }
    const expected = sorted[i]!;
    if (expected.cell === target) {
      continue;
    }

    const fromCol = expected.cell % SUSHI_GRID.COLUMNS;
    const fromRow = Math.floor(expected.cell / SUSHI_GRID.COLUMNS);
    const toCol = target % SUSHI_GRID.COLUMNS;
    const toRow = Math.floor(target / SUSHI_GRID.COLUMNS);

    return {
      from: cellToPoint(expected.cell),
      to: cellToPoint(target),
      tier: expected.tier,
      fromRow,
      fromCol,
      toRow,
      toCol,
    };
  }

  return null;
};

type CascadeStep = { cell: number; tierBefore: number; tierAfter: number };

type MergePlan = {
  fromCell: number;
  toCell: number;
  mergeTier: number;
  resultTier: number;
  cascade: CascadeStep[];
};

const planBestMerge = (
  board: CellTier[],
  buffCap: number
): MergePlan | null => {
  const byTier = new Map<number, CellTier[]>();
  for (const piece of board) {
    const list = byTier.get(piece.tierNumber);
    if (list) {
      list.push(piece);
    } else {
      byTier.set(piece.tierNumber, [piece]);
    }
  }

  let bestTier = -1;
  let bestPieces: CellTier[] | null = null;
  for (const [tier, pieces] of byTier) {
    if (pieces.length < 2) {
      continue;
    }
    if (tier > bestTier) {
      bestTier = tier;
      bestPieces = pieces;
    }
  }

  if (!bestPieces) {
    return null;
  }

  const sortedByCell = [...bestPieces].sort((a, b) => a.cell - b.cell);
  const fromCell = sortedByCell[0]!.cell;
  const toCell = sortedByCell[1]!.cell;

  const cellToTier = new Map<number, number>();
  for (const piece of board) {
    cellToTier.set(piece.cell, piece.tierNumber);
  }

  const cascade: CascadeStep[] = [];
  const resultTier = bestTier + 1;
  let incomingTier = resultTier;
  let cursor = toCell + 1;

  while (cursor < TOTAL_CELLS) {
    const currentTier = cellToTier.get(cursor);
    if (currentTier === undefined) {
      break;
    }
    if (currentTier > buffCap) {
      break;
    }
    if (currentTier >= incomingTier) {
      break;
    }
    const newTier = currentTier + 1;
    cascade.push({ cell: cursor, tierBefore: currentTier, tierAfter: newTier });
    incomingTier = newTier;
    cursor++;
  }

  return {
    fromCell,
    toCell,
    mergeTier: bestTier,
    resultTier,
    cascade,
  };
};

const countEmpty = (
  board: CellTier[],
  availableCells: ReadonlySet<number>
): number => {
  const occupied = new Set<number>();
  for (const piece of board) {
    occupied.add(piece.cell);
  }
  let empty = 0;
  for (const cell of availableCells) {
    if (!occupied.has(cell)) {
      empty++;
    }
  }
  return empty;
};

const logMergePlan = (plan: MergePlan): void => {
  const fromCol = plan.fromCell % SUSHI_GRID.COLUMNS;
  const fromRow = Math.floor(plan.fromCell / SUSHI_GRID.COLUMNS);
  const toCol = plan.toCell % SUSHI_GRID.COLUMNS;
  const toRow = Math.floor(plan.toCell / SUSHI_GRID.COLUMNS);

  logger.log(
    `sushi-station-max-buff - best merge: T${plan.mergeTier} [${fromRow},${fromCol}] -> [${toRow},${toCol}] (result T${plan.resultTier})`
  );
  logger.log(
    `sushi-station-max-buff - cascade: ${plan.cascade.length} triggers`
  );

  for (const step of plan.cascade) {
    const col = step.cell % SUSHI_GRID.COLUMNS;
    const row = Math.floor(step.cell / SUSHI_GRID.COLUMNS);
    logger.log(
      `sushi-station-max-buff -   [${row},${col}] T${step.tierBefore} -> T${step.tierAfter}`
    );
  }

  const totalAnimationMs = MERGE_ANIMATION_MS_PER_TRIGGER * plan.cascade.length;
  logger.log(
    `sushi-station-max-buff - cascade animation wait would be ${totalAnimationMs}ms (${plan.cascade.length} x ${MERGE_ANIMATION_MS_PER_TRIGGER}ms)`
  );
};

export default defineScript<[number, boolean]>({
  id: "world7.sushiStation.sushiStationMaxBuffMerge",
  name: "Sushi Station - Max Buff Merge",
  run: async ({ token, args: [highestTier, shouldCook] }) => {
    const buffCap = highestTier - 6;

    if (buffCap <= 0) {
      logger.log(
        "sushi-station-max-buff - buff cap is non-positive, running as plain descending merge"
      );
    }

    logger.log(
      `sushi-station-max-buff - starting (highest T${highestTier}, X = T${buffCap})`
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
      { normal: GRID_SLOT, red: GRID_SLOT_RED },
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
    for (const result of calibrationScan.results) {
      if (result.match !== null) {
        availableCells.add(result.regionIndex);
      }
    }

    const priorityCells = getMaxBuffPriorityCells(availableCells);

    logger.log(
      `sushi-station-max-buff - calibrated ${availableCells.size} available cells (normal ${slotMatches.normal?.length ?? 0}, red ${slotMatches.red?.length ?? 0}, occupied ${calibrationScan.results.filter((r) => r.match !== null).length})`
    );

    if (availableCells.size === 0) {
      logger.log("sushi-station-max-buff - no available cells, aborting");
      return;
    }

    let prevEmptyCount = Number.POSITIVE_INFINITY;
    let spawnedLastIteration = false;

    while (true) {
      token.throwIfCancelled();

      // ----- Sort phase: drain all sort moves with no inter-drag delay. -----
      let sortDrags = 0;
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

        logger.log(
          `sushi-station-max-buff - sorting ${move.tier} [${move.fromRow},${move.fromCol}] -> [${move.toRow},${move.toCol}]`
        );
        token.throwIfCancelled();
        const dragOptions = getDragOptionsFromPreset("16x", true);
        await backendCommand.drag(move.from, move.to, dragOptions, token);
        sortDrags++;
      }

      logger.log(
        `sushi-station-max-buff - sort phase complete (${sortDrags} drags)`
      );

      await delay(PHASE_DELAY_MS, token);

      // ----- Empty-cell census after sort settle. -----
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
        logger.log("sushi-station-max-buff - board is full, exiting loop");
        break;
      }

      logger.log(`sushi-station-max-buff - ${emptyCount} empty cells`);

      if (spawnedLastIteration && emptyCount >= prevEmptyCount) {
        logger.log(
          "sushi-station-max-buff - spawn did not reduce empty count, exiting"
        );
        break;
      }
      prevEmptyCount = emptyCount;

      // ----- Merge phase (gated): once enabled, runs here, then waits
      // MERGE_ANIMATION_MS_PER_TRIGGER * triggers before looping back to sort.
      if (PERFORM_MERGE) {
        const plan = planBestMerge(censusBoard, buffCap);
        if (plan) {
          logMergePlan(plan);
          token.throwIfCancelled();
          const dragOptions = getDragOptionsFromPreset("16x", true);
          await backendCommand.drag(
            cellToPoint(plan.fromCell),
            cellToPoint(plan.toCell),
            dragOptions,
            token
          );
          await delay(
            MERGE_ANIMATION_MS_PER_TRIGGER * plan.cascade.length,
            token
          );
        }
      }

      // ----- Spawn phase: cook a batch if user enabled it. -----
      if (!shouldCook) {
        logger.log(
          "sushi-station-max-buff - cook disabled, exiting loop with empty cells remaining"
        );
        break;
      }

      logger.log(
        `sushi-station-max-buff - cooking ${COOK_BATCH_SIZE} sushi (${emptyCount} empty cells to fill)`
      );
      const cookButton = await backendCommand.isVisible(
        SUSHI_COOK,
        undefined,
        token
      );
      if (cookButton.length === 0) {
        logger.log("sushi-station-max-buff - cook button not visible, exiting");
        break;
      }
      const clickOptions = getClickOptionsFromPreset("16x");
      await backendCommand.click(
        cookButton[0]!,
        { ...clickOptions, times: COOK_BATCH_SIZE },
        token
      );
      await delay(PHASE_DELAY_MS, token);
      spawnedLastIteration = true;
    }

    // ----- Analysis phase: one-shot, after the loop exits. -----
    logger.log("sushi-station-max-buff - analyzing best merge");

    token.throwIfCancelled();

    const finalScan = await backendCommand.readRegions(
      regions,
      { ...SUSHI_HSV_LOWER },
      { ...SUSHI_HSV_UPPER },
      SUSHI_TEMPLATES,
      undefined,
      token
    );

    const finalBoard = buildBoardFromResults(finalScan.results);

    const plan = planBestMerge(finalBoard, buffCap);

    if (!plan) {
      logger.log("sushi-station-max-buff - no mergeable pairs found");
      return;
    }

    logMergePlan(plan);
  },
});
