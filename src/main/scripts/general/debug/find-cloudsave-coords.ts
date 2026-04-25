import type { Point } from "../../../backend/backend-types";
import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";

const HSV_WHITE_LOWER = { h: 0, s: 0, v: 1 };
const HSV_WHITE_UPPER = { h: 192, s: 255, v: 255 };

const HSV_PLAY_LOWER = { h: 0, s: 0, v: 128 };
const HSV_PLAY_UPPER = { h: 192, s: 255, v: 255 };

const ROW_Y_TOLERANCE = 30;

const sortFeet = (points: Point[]): Point[] => {
  const sortedByY = [...points].sort((a, b) => a.y - b.y);
  const rows: Point[][] = [];
  for (const p of sortedByY) {
    const row = rows.find((r) => Math.abs(r[0]!.y - p.y) <= ROW_Y_TOLERANCE);
    if (row) {
      row.push(p);
    } else {
      rows.push([p]);
    }
  }
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
  }
  return rows.flat();
};

export default defineScript({
  id: "general.debug.findCloudsaveCoords",
  name: "Debug: Find Cloudsave Coords",
  run: async ({ token }) => {
    logger.log("findCloudsaveCoords - start - run while on the main menu");

    const whiteImages = {
      page_back: "main-menu/page_back",
      page_next: "main-menu/page_next",
      player_feet: "main-menu/player_feet",
    } as const;

    const whiteResults = await backendCommand.findHSVParallel(
      whiteImages,
      HSV_WHITE_LOWER,
      HSV_WHITE_UPPER,
      undefined,
      token
    );

    const playPoints = await backendCommand.findHSV(
      "main-menu/play",
      HSV_PLAY_LOWER,
      HSV_PLAY_UPPER,
      undefined,
      token
    );

    const pageBack = whiteResults.page_back ?? [];
    const pageNext = whiteResults.page_next ?? [];
    const playerFeetRaw = whiteResults.player_feet ?? [];
    const playerFeet = sortFeet(playerFeetRaw);

    logger.log(
      `findCloudsaveCoords - page_back matches=${pageBack.length} ${JSON.stringify(pageBack)}`
    );
    logger.log(
      `findCloudsaveCoords - page_next matches=${pageNext.length} ${JSON.stringify(pageNext)}`
    );
    logger.log(
      `findCloudsaveCoords - play matches=${playPoints.length} ${JSON.stringify(playPoints)}`
    );
    logger.log(
      `findCloudsaveCoords - player_feet matches=${playerFeet.length} (sorted top-row L-R, bottom-row L-R) ${JSON.stringify(playerFeet)}`
    );

    for (let i = 0; i < playerFeet.length; i++) {
      const p = playerFeet[i]!;
      logger.log(`findCloudsaveCoords - feet[${i + 1}] = (${p.x}, ${p.y})`);
    }

    logger.log("findCloudsaveCoords - done");
  },
});
