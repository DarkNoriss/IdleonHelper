import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  buildSushiRegions,
  SUSHI_HSV_LOWER,
  SUSHI_HSV_UPPER,
  SUSHI_TIERS_OFF,
  SUSHI_TIERS_ON,
} from "./sushi-station-constants";

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

    // 2. Full grid scan - no templates, debug mode to save raw + filtered images
    const regions = buildSushiRegions();

    logger.log(
      `sushi-station-debug - scanning ${regions.length} regions, no templates, debug=true`
    );

    const response = await backendCommand.readRegions(
      regions,
      { ...SUSHI_HSV_LOWER },
      { ...SUSHI_HSV_UPPER },
      [],
      { debug: true },
      token
    );

    logger.log(`sushi-station-debug - got ${response.results.length} results`);

    for (const result of response.results) {
      const col = result.regionIndex % 15;
      const row = Math.floor(result.regionIndex / 15);
      logger.log(
        `sushi-station-debug - [${row},${col}] pixels=${result.nonZeroPixels}${result.debugImagePath ? ` path=${result.debugImagePath}` : ""}`
      );
    }
  },
});
