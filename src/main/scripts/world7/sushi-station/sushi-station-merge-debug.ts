import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";

const SUSHI_PATH = "ui/map/world-7/sushi-station";

export default defineScript({
  id: "world7.sushiStation.sushiStationMergeDebug",
  name: "Sushi Station - Debug",
  run: async ({ token }) => {
    logger.log("sushi-station-debug - finding grid slots with debug");

    const response = await backendCommand.findWithDebug(
      `${SUSHI_PATH}/grid_slot`,
      undefined,
      token
    );

    logger.log(
      `sushi-station-debug - found ${response.matches.length} matches`
    );

    for (const match of response.matches) {
      logger.log(
        `sushi-station-debug - x=${match.point.x} y=${match.point.y} similarity=${(match.similarity * 100).toFixed(1)}%`
      );
    }

    if (response.debugImagePath) {
      logger.log(
        `sushi-station-debug - debug image: ${response.debugImagePath}`
      );
    }

    logger.log("sushi-station-debug - done");
  },
});
