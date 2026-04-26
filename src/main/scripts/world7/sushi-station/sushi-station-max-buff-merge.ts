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

const SORT_DELAY_MS = 2000;
const MERGE_ANIMATION_MS_PER_TRIGGER = 2000;

// Gate: flip to true once merge + cascade animation timing is wired up.
// While false, the script only sorts the board and reports the projected
// best-merge cascade in the logs without dragging the merge.
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

type BuffAwareMerge = {
  from: Point;
  to: Point;
  tier: string;
  tierNumber: number;
  fromCell: number;
  toCell: number;
  buffTargetTier: number | null;
  score: number;
};

const pickBuffAwareMerge = (
  board: CellTier[],
  buffCap: number
): BuffAwareMerge | null => {
  const byTier = new Map<string, CellTier[]>();
  for (const piece of board) {
    const list = byTier.get(piece.tier);
    if (list) {
      list.push(piece);
    } else {
      byTier.set(piece.tier, [piece]);
    }
  }

  const cellToTier = new Map<number, number>();
  for (const piece of board) {
    cellToTier.set(piece.cell, piece.tierNumber);
  }

  let best: BuffAwareMerge | null = null;

  for (const pieces of byTier.values()) {
    if (pieces.length < 2) {
      continue;
    }
    const tierNumber = pieces[0]!.tierNumber;
    const tierMatch = pieces[0]!.tier;
    const resultTier = tierNumber + 1;

    for (let i = 0; i < pieces.length; i++) {
      for (let j = 0; j < pieces.length; j++) {
        if (i === j) {
          continue;
        }
        const fromCell = pieces[i]!.cell;
        const toCell = pieces[j]!.cell;
        const rightCell = toCell + 1;

        let buffTargetTier: number | null = null;
        let score = 0;

        if (rightCell < TOTAL_CELLS) {
          const rightTier = cellToTier.get(rightCell);
          if (
            rightTier !== undefined &&
            rightTier <= buffCap &&
            rightTier < resultTier
          ) {
            buffTargetTier = rightTier;
            score = 1;

            const bumpedTier = rightTier + 1;
            for (const other of board) {
              if (other.cell === rightCell) {
                continue;
              }
              if (other.tierNumber === bumpedTier) {
                score = 2;
                break;
              }
            }
          }
        }

        const candidate: BuffAwareMerge = {
          from: cellToPoint(fromCell),
          to: cellToPoint(toCell),
          tier: tierMatch,
          tierNumber,
          fromCell,
          toCell,
          buffTargetTier,
          score,
        };

        if (best === null) {
          best = candidate;
          continue;
        }
        if (candidate.score > best.score) {
          best = candidate;
          continue;
        }
        if (candidate.score < best.score) {
          continue;
        }
        if (candidate.tierNumber > best.tierNumber) {
          best = candidate;
          continue;
        }
        if (candidate.tierNumber < best.tierNumber) {
          continue;
        }
        const candRight = candidate.buffTargetTier ?? -1;
        const bestRight = best.buffTargetTier ?? -1;
        if (candRight > bestRight) {
          best = candidate;
          continue;
        }
        if (candRight === bestRight && candidate.toCell < best.toCell) {
          best = candidate;
        }
      }
    }
  }

  return best;
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

    logger.log("sushi-station-max-buff - starting sort phase");

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

      if (PERFORM_MERGE) {
        const merge = pickBuffAwareMerge(board, buffCap);
        if (merge) {
          const fromCol = merge.fromCell % SUSHI_GRID.COLUMNS;
          const fromRow = Math.floor(merge.fromCell / SUSHI_GRID.COLUMNS);
          const toCol = merge.toCell % SUSHI_GRID.COLUMNS;
          const toRow = Math.floor(merge.toCell / SUSHI_GRID.COLUMNS);

          const buffNote =
            merge.buffTargetTier === null
              ? " (no buff)"
              : ` (buff T${merge.buffTargetTier} -> T${merge.buffTargetTier + 1}, score ${merge.score})`;

          logger.log(
            `sushi-station-max-buff - merging T${merge.tierNumber} [${fromRow},${fromCol}] -> [${toRow},${toCol}]${buffNote}`
          );

          token.throwIfCancelled();
          const dragOptions = getDragOptionsFromPreset("16x", true);
          await backendCommand.drag(merge.from, merge.to, dragOptions, token);
          continue;
        }
      }

      const move = pickSortMove(board, priorityCells);
      if (move) {
        logger.log(
          `sushi-station-max-buff - sorting ${move.tier} [${move.fromRow},${move.fromCol}] -> [${move.toRow},${move.toCol}]`
        );
        token.throwIfCancelled();
        const dragOptions = getDragOptionsFromPreset("16x", true);
        await backendCommand.drag(move.from, move.to, dragOptions, token);
        await delay(SORT_DELAY_MS, token);
        continue;
      }

      if (PERFORM_MERGE && shouldCook) {
        logger.log("sushi-station-max-buff - no pairs, cooking more sushi");
        const cookButton = await backendCommand.isVisible(
          SUSHI_COOK,
          undefined,
          token
        );
        if (cookButton.length > 0) {
          const clickOptions = getClickOptionsFromPreset("16x");
          await backendCommand.click(
            cookButton[0]!,
            { ...clickOptions, times: 40 },
            token
          );
        }
        continue;
      }

      break;
    }

    logger.log("sushi-station-max-buff - sort complete, analyzing best merge");

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

    const totalAnimationMs =
      MERGE_ANIMATION_MS_PER_TRIGGER * plan.cascade.length;
    logger.log(
      `sushi-station-max-buff - cascade animation wait would be ${totalAnimationMs}ms (${plan.cascade.length} x ${MERGE_ANIMATION_MS_PER_TRIGGER}ms)`
    );
  },
});
