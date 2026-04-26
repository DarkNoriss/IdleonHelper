import {
  backendCommand,
  getClickOptionsFromPreset,
  getDragOptionsFromPreset,
  type Point,
  type Rect,
  type RegionResult,
} from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { delay, logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  buildSushiRegions,
  GRID_SLOT,
  GRID_SLOT_RED,
  GRID_SLOT_YELLOW,
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
const MERGE_ANIMATION_MS_PER_TRIGGER = 2000;

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

// Wind of the East fires once per merge: only the cell immediately to the
// right of `to` (snake-wrap) is buffed, and the bump does NOT cascade further.
// Verified empirically on 2026-04-26: predicted 18 chained bumps, only the
// first bump landed.
//
// To make best use of the mechanic, evaluate every (i, j) pair in both drag
// directions and pick the merge whose buff lands on the highest-tier eligible
// neighbor. Non-buff merges are deferred (return null) so high-tier pairs that
// cannot buff yet wait for lower tiers to catch up.
const planBestMerge = (
  board: CellTier[],
  buffCap: number
): MergePlan | null => {
  const cellToTier = new Map<number, number>();
  for (const piece of board) {
    cellToTier.set(piece.cell, piece.tierNumber);
  }

  const byTier = new Map<number, CellTier[]>();
  for (const piece of board) {
    const list = byTier.get(piece.tierNumber);
    if (list) {
      list.push(piece);
    } else {
      byTier.set(piece.tierNumber, [piece]);
    }
  }

  let bestPlan: MergePlan | null = null;
  let bestBuffTier = -1;
  let bestMergeTier = -1;
  let bestToCell = Number.POSITIVE_INFINITY;

  for (const [mergeTier, pieces] of byTier) {
    if (pieces.length < 2) {
      continue;
    }
    const resultTier = mergeTier + 1;

    for (let i = 0; i < pieces.length; i++) {
      for (let j = 0; j < pieces.length; j++) {
        if (i === j) {
          continue;
        }
        const fromCell = pieces[i]!.cell;
        const toCell = pieces[j]!.cell;
        const rightCell = toCell + 1;

        if (rightCell >= TOTAL_CELLS) {
          continue;
        }
        // After the merge, `from` is empty — if it sits to the right of `to`
        // there is no piece left to buff.
        if (rightCell === fromCell) {
          continue;
        }
        const rightTier = cellToTier.get(rightCell);
        if (rightTier === undefined) {
          continue;
        }
        if (rightTier > buffCap) {
          continue;
        }
        if (rightTier >= resultTier) {
          continue;
        }

        const better =
          rightTier > bestBuffTier ||
          (rightTier === bestBuffTier && mergeTier > bestMergeTier) ||
          (rightTier === bestBuffTier &&
            mergeTier === bestMergeTier &&
            toCell < bestToCell);

        if (better) {
          bestBuffTier = rightTier;
          bestMergeTier = mergeTier;
          bestToCell = toCell;
          bestPlan = {
            fromCell,
            toCell,
            mergeTier,
            resultTier,
            cascade: [
              {
                cell: rightCell,
                tierBefore: rightTier,
                tierAfter: rightTier + 1,
              },
            ],
          };
        }
      }
    }
  }

  return bestPlan;
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

const formatCell = (cell: number): string => {
  const col = cell % SUSHI_GRID.COLUMNS;
  const row = Math.floor(cell / SUSHI_GRID.COLUMNS);
  return `[${row},${col}]`;
};

const logMergePlan = (plan: MergePlan): void => {
  logger.log(
    `sushi-station-max-buff - best merge: T${plan.mergeTier} ${formatCell(plan.fromCell)} -> ${formatCell(plan.toCell)} (result T${plan.resultTier})`
  );
  logger.log(
    `sushi-station-max-buff - cascade: ${plan.cascade.length} triggers`
  );
  for (const step of plan.cascade) {
    logger.log(
      `sushi-station-max-buff -   ${formatCell(step.cell)} T${step.tierBefore} -> T${step.tierAfter}`
    );
  }
};

const verifyMerge = (plan: MergePlan, actualBoard: CellTier[]): void => {
  const cellToActualTier = new Map<number, number>();
  for (const piece of actualBoard) {
    cellToActualTier.set(piece.cell, piece.tierNumber);
  }

  const formatActual = (tier: number | undefined): string =>
    tier === undefined ? "empty" : `T${tier}`;

  let passes = 0;
  let total = 0;

  // From cell should be empty after the merge.
  total++;
  const fromActual = cellToActualTier.get(plan.fromCell);
  if (fromActual === undefined) {
    logger.log(
      `sushi-station-max-buff -   PASS ${formatCell(plan.fromCell)} empty (was T${plan.mergeTier})`
    );
    passes++;
  } else {
    logger.log(
      `sushi-station-max-buff -   FAIL ${formatCell(plan.fromCell)} expected empty, actual ${formatActual(fromActual)}`
    );
  }

  // To cell should hold the merge result tier.
  total++;
  const toActual = cellToActualTier.get(plan.toCell);
  if (toActual === plan.resultTier) {
    logger.log(
      `sushi-station-max-buff -   PASS ${formatCell(plan.toCell)} T${plan.resultTier} (merge result)`
    );
    passes++;
  } else {
    logger.log(
      `sushi-station-max-buff -   FAIL ${formatCell(plan.toCell)} expected T${plan.resultTier}, actual ${formatActual(toActual)}`
    );
  }

  // Each cascade step should match its predicted tier.
  for (const step of plan.cascade) {
    total++;
    const actual = cellToActualTier.get(step.cell);
    if (actual === step.tierAfter) {
      logger.log(
        `sushi-station-max-buff -   PASS ${formatCell(step.cell)} T${step.tierBefore} -> T${step.tierAfter}`
      );
      passes++;
    } else {
      logger.log(
        `sushi-station-max-buff -   FAIL ${formatCell(step.cell)} expected T${step.tierAfter}, actual ${formatActual(actual)}`
      );
    }
  }

  logger.log(
    `sushi-station-max-buff - verification: ${passes}/${total} predictions match`
  );
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
    logger.log(
      `sushi-station-max-buff - sorting ${move.tier} [${move.fromRow},${move.fromCol}] -> [${move.toRow},${move.toCol}]`
    );
    token.throwIfCancelled();
    const dragOptions = getDragOptionsFromPreset("16x", true);
    await backendCommand.drag(move.from, move.to, dragOptions, token);
    drags++;
  }
  return drags;
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

    const priorityCells = getMaxBuffPriorityCells(availableCells);

    logger.log(
      `sushi-station-max-buff - calibrated ${availableCells.size} available cells (normal ${slotMatches.normal?.length ?? 0}, red ${slotMatches.red?.length ?? 0}, yellow ${slotMatches.yellow?.length ?? 0}, occupied ${calibrationScan.results.filter((r) => r.match !== null).length})`
    );

    if (availableCells.size === 0) {
      logger.log("sushi-station-max-buff - no available cells, aborting");
      return;
    }

    // ----- PHASE 1: Sort drain (no inter-drag delay) -----
    const sortDrags1 = await runSortDrain(regions, priorityCells, token);
    logger.log(
      `sushi-station-max-buff - sort phase 1 complete (${sortDrags1} drags)`
    );

    await delay(PHASE_DELAY_MS, token);

    // ----- PHASE 2: Spawn one batch if there are empty cells -----
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

    // ----- PHASE 2.5: Re-sort to absorb spawned pieces -----
    const sortDrags2 = await runSortDrain(regions, priorityCells, token);
    logger.log(
      `sushi-station-max-buff - sort phase 2 complete (${sortDrags2} drags)`
    );

    await delay(PHASE_DELAY_MS, token);

    // ----- PHASE 3: Plan and execute one merge -----
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

    const plan = planBestMerge(preMergeBoard, buffCap);
    if (!plan) {
      logger.log(
        "sushi-station-max-buff - no buff-firing merge available, deferring high-tier pairs"
      );
      return;
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

    // Wait for merge animation + cascade animations: the merge itself counts
    // as the first bump (1) and each cascade trigger is one more bump.
    const totalWaitMs =
      MERGE_ANIMATION_MS_PER_TRIGGER * (1 + plan.cascade.length);
    logger.log(
      `sushi-station-max-buff - waiting ${totalWaitMs}ms (${1 + plan.cascade.length} bumps x ${MERGE_ANIMATION_MS_PER_TRIGGER}ms)`
    );
    await delay(totalWaitMs, token);

    // ----- PHASE 4: Verify the cascade prediction against the real board -----
    logger.log("sushi-station-max-buff - verifying cascade outcome");
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

    verifyMerge(plan, postMergeBoard);

    logger.log("sushi-station-max-buff - run complete");
  },
});
