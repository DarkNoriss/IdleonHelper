import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  buildOvergrowthRegions,
  FARMING_GRID,
  OVERGROWTH_HSV_LOWER,
  OVERGROWTH_HSV_UPPER,
  OVERGROWTH_TEMPLATES,
} from "./farming-constants";

export default defineScript({
  id: "world6.farming.farmingCollectCropsDebug",
  name: "Farming - Collect Crops Debug",
  run: async ({ token }) => {
    token.throwIfCancelled();

    const regions = buildOvergrowthRegions();

    logger.log(
      `farming-collect-crops-debug - scanning ${regions.length} crop positions`
    );

    const response = await backendCommand.readRegions(
      regions,
      { ...OVERGROWTH_HSV_LOWER },
      { ...OVERGROWTH_HSV_UPPER },
      OVERGROWTH_TEMPLATES,
      { debug: true },
      token
    );

    logger.log("farming-collect-crops-debug - scan results");

    let matchCount = 0;
    for (const result of response.results) {
      const col = result.regionIndex % FARMING_GRID.COLUMNS;
      const row = Math.floor(result.regionIndex / FARMING_GRID.COLUMNS);
      const pixels = `pixels=${result.nonZeroPixels}`;
      const match = result.match
        ? `MATCH: ${result.match} (${(result.similarity * 100).toFixed(1)}%)`
        : `no match (similarity: ${(result.similarity * 100).toFixed(1)}%)`;
      const debug = result.debugImagePath
        ? ` saved: ${result.debugImagePath}`
        : "";
      logger.log(
        `plot [${row},${col}] (index ${result.regionIndex}): ${pixels}, ${match}${debug}`
      );
      if (result.match) {
        matchCount++;
      }
    }

    logger.log(
      `farming-collect-crops-debug - ${matchCount} of ${regions.length} plots have overgrowth`
    );
  },
});
