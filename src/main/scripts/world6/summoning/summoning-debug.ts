import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  BOARD_HSV_LOWER,
  BOARD_HSV_UPPER,
  GAME_BOARD,
} from "./summoning-constants";

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

    logger.log(`summoning-debug - found ${matches.length} board tile(s)`);
    for (const m of matches) {
      logger.log(`summoning-debug - tile at ${m.x},${m.y}`);
    }

    if (matches.length === 0) {
      logger.log(
        "summoning-debug - no tiles matched - check HSV range or template"
      );
      return;
    }

    let xMin = matches[0]!.x;
    let xMax = matches[0]!.x;
    let yMin = matches[0]!.y;
    let yMax = matches[0]!.y;
    for (const m of matches) {
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
      `summoning-debug - x range: ${xMin} - ${xMax} (suggested BOARD_CENTER_X: ${cxSuggest})`
    );
    logger.log(`summoning-debug - y range: ${yMin} - ${yMax}`);
  },
});
