import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  BOARD_HSV_LOWER,
  BOARD_HSV_UPPER,
  GAME_BOARD,
} from "./summoning-constants";
import { filterBoardOutliers } from "./summoning-helpers";

export const debugBoardRange = defineScript({
  id: "world6.summoning.debugBoardRange",
  name: "Debug - Summoning Board Range",
  run: async ({ token }) => {
    logger.log("summoning-debug - capturing board matches");
    const matches = await backendCommand.findHSV(
      GAME_BOARD,
      BOARD_HSV_LOWER,
      BOARD_HSV_UPPER,
      { debug: true },
      token
    );

    logger.log(`summoning-debug - raw: ${matches.length} board tile(s)`);
    for (const m of matches) {
      logger.log(`summoning-debug - raw tile at ${m.x},${m.y}`);
    }

    if (matches.length === 0) {
      logger.log(
        "summoning-debug - no tiles matched - check HSV range or template"
      );
      return;
    }

    const filtered = filterBoardOutliers(matches);
    logger.log(
      `summoning-debug - after outlier filter: ${filtered.length} tile(s) kept`
    );

    if (filtered.length === 0) {
      logger.log(
        "summoning-debug - filter rejected everything - dense cluster not found"
      );
      return;
    }

    let xMin = filtered[0]!.x;
    let xMax = filtered[0]!.x;
    let yMin = filtered[0]!.y;
    let yMax = filtered[0]!.y;
    for (const m of filtered) {
      if (m.x < xMin) {
        xMin = m.x;
      }
      if (m.x > xMax) {
        xMax = m.x;
      }
      if (m.y < yMin) {
        yMin = m.y;
      }
      if (m.y > yMax) {
        yMax = m.y;
      }
    }
    const cxSuggest = Math.round((xMin + xMax) / 2);

    logger.log(
      `summoning-debug - filtered x range: ${xMin} - ${xMax} (suggested BOARD_CENTER_X: ${cxSuggest})`
    );
    logger.log(`summoning-debug - filtered y range: ${yMin} - ${yMax}`);
  },
});
