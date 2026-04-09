import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { SUSHI_TIERS_OFF, SUSHI_TIERS_ON } from "./sushi-station-constants";

export default defineScript({
  id: "world7.sushiStation.sushiStationMergeDebug",
  name: "Sushi Station - Debug",
  run: async ({ token }) => {
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

    for (const match of tiersOn) {
      logger.log(`sushi-station-debug - tiers on at x=${match.x} y=${match.y}`);
    }

    for (const match of tiersOff) {
      logger.log(
        `sushi-station-debug - tiers off at x=${match.x} y=${match.y}`
      );
    }

    logger.log("sushi-station-debug - done");
  },
});
