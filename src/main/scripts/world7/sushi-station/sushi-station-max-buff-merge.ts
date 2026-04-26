import {
  backendCommand,
  getClickOptionsFromPreset,
  getDragOptionsFromPreset,
  type Point,
  type RegionResult,
} from "../../../backend/index";
import { logger } from "../../../utils/index";
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

export default defineScript<[number, boolean]>({
  id: "world7.sushiStation.sushiStationMaxBuffMerge",
  name: "Sushi Station - Max Buff Merge",
  run: async ({ token, args: [highestTier, shouldCook] }) => {
    const buffCap = highestTier - 6;

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
      `sushi-station-max-buff - calibrated ${availableCells.size} available cells`
    );

    if (availableCells.size === 0) {
      logger.log("sushi-station-max-buff - no available cells, aborting");
      return;
    }

    logger.log("sushi-station-max-buff - starting buff-aware merge loop");

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

      const merge = pickBuffAwareMerge(board, buffCap);

      let actedThisIteration = false;

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
        actedThisIteration = true;
      }

      if (!actedThisIteration) {
        const move = pickSortMove(board, priorityCells);
        if (move) {
          logger.log(
            `sushi-station-max-buff - sorting ${move.tier} [${move.fromRow},${move.fromCol}] -> [${move.toRow},${move.toCol}]`
          );
          token.throwIfCancelled();
          const dragOptions = getDragOptionsFromPreset("16x", true);
          await backendCommand.drag(move.from, move.to, dragOptions, token);
          actedThisIteration = true;
        }
      }

      if (!actedThisIteration && shouldCook) {
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
      }
    }
  },
});
