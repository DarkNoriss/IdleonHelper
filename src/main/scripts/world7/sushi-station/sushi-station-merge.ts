import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  buildSushiRegions,
  SUSHI_GRID,
  SUSHI_HSV_LOWER,
  SUSHI_HSV_UPPER,
  SUSHI_TEMPLATES,
} from "./sushi-station-constants";

const cellToPoint = (cellIndex: number) => {
  const col = cellIndex % SUSHI_GRID.COLUMNS;
  const row = Math.floor(cellIndex / SUSHI_GRID.COLUMNS);
  return {
    x: SUSHI_GRID.FIRST_POSITION.x + col * SUSHI_GRID.X_STEP,
    y: SUSHI_GRID.FIRST_POSITION.y + row * SUSHI_GRID.Y_STEP,
  };
};

export default defineScript({
  id: "world7.sushiStation.sushiStationMerge",
  name: "Sushi Station - Merge",
  run: async ({ token }) => {
    logger.log("sushi-station-merge - starting continuous merge loop");

    const regions = buildSushiRegions();

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

      let merged = false;
      for (const [tier, indices] of grouped) {
        if (indices.length < 2) {
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
        await backendCommand.drag(from, to, { instant: true }, token);
        merged = true;
        break;
      }

      if (!merged) {
        // Re-scan if no merge happened
      }
    }
  },
});
