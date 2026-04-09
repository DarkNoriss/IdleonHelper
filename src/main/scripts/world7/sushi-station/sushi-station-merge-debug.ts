import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  buildSushiRegions,
  SUSHI_HSV_LOWER,
  SUSHI_HSV_UPPER,
  SUSHI_TEMPLATES,
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

    // 2. Minimal test: scan first 3 cells with just sushi_t1 template
    const firstRegion = buildSushiRegions().slice(0, 3);
    const singleTemplate = [SUSHI_TEMPLATES[0]!];

    logger.log(
      `sushi-station-debug - testing ${firstRegion.length} regions with ${singleTemplate[0]}`
    );
    logger.log(
      `sushi-station-debug - region 0: x=${firstRegion[0]!.x} y=${firstRegion[0]!.y} w=${firstRegion[0]!.width} h=${firstRegion[0]!.height}`
    );

    const response = await backendCommand.readRegions(
      firstRegion,
      { ...SUSHI_HSV_LOWER },
      { ...SUSHI_HSV_UPPER },
      singleTemplate,
      undefined,
      token
    );

    logger.log(`sushi-station-debug - got ${response.results.length} results`);

    for (const result of response.results) {
      logger.log(
        `sushi-station-debug - region ${result.regionIndex} match=${result.match ?? "none"} similarity=${result.similarity} pixels=${result.nonZeroPixels}`
      );
    }
  },
});
