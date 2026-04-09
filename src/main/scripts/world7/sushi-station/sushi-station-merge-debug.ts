import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  buildSushiRegions,
  SUSHI_HSV_LOWER,
  SUSHI_HSV_UPPER,
  SUSHI_TEMPLATES,
} from "./sushi-station-constants";

export default defineScript({
  id: "world7.sushiStation.sushiStationMergeDebug",
  name: "Sushi Station - Debug",
  run: async ({ token }) => {
    logger.log("sushi-station-debug - scanning grid with debug enabled");

    const regions = buildSushiRegions();

    const response = await backendCommand.readRegions(
      regions,
      { ...SUSHI_HSV_LOWER },
      { ...SUSHI_HSV_UPPER },
      SUSHI_TEMPLATES,
      { debug: true },
      token
    );

    for (const result of response.results) {
      const col = result.regionIndex % 15;
      const row = Math.floor(result.regionIndex / 15);
      logger.log(
        `sushi-station-debug - [${row},${col}] match=${result.match ?? "none"} similarity=${result.similarity.toFixed(3)} pixels=${result.nonZeroPixels}`
      );
    }

    const matched = response.results.filter((r) => r.match !== null);
    logger.log(
      `sushi-station-debug - total matched: ${matched.length}/${response.results.length}`
    );
    logger.log("sushi-station-debug - done, check debug-regions folder");
  },
});
