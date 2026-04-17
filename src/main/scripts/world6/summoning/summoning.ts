import type { Point } from "../../../backend/backend-types";
import { backendCommand } from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { delay, logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  BEGIN_MATCH,
  BOARD_CENTER_X,
  BOARD_HSV_LOWER,
  BOARD_HSV_UPPER,
  CHEST,
  CHEST_CLICK_DELAY_MS,
  CHEST_COLLECTION_TIMEOUT_MS,
  GAME_BOARD,
  INFINITY_ICON,
  INIT_CONFIRM_TIMEOUT_MS,
  MIN_RADIUS_PX,
  UI_HSV_LOWER,
  UI_HSV_UPPER,
} from "./summoning-constants";
import { computeBoardYRange, generateCirclePoints } from "./summoning-helpers";

const ensureBeginMatchScreen = async (
  token: CancellationToken
): Promise<void> => {
  const visibility = await backendCommand.isVisibleHSVParallel(
    { infinity: INFINITY_ICON, beginMatch: BEGIN_MATCH },
    UI_HSV_LOWER,
    UI_HSV_UPPER,
    undefined,
    token
  );

  const infinityMatches = visibility.infinity ?? [];
  const beginMatchMatches = visibility.beginMatch ?? [];

  if (beginMatchMatches.length > 0) {
    logger.log("summoning - init: begin_match visible, proceeding");
    return;
  }

  if (infinityMatches.length === 0) {
    throw new Error(
      "summoning - init: neither infinity nor begin_match visible - not on summoning screen"
    );
  }

  logger.log(
    "summoning - init: infinity visible, double-clicking to enter endless"
  );
  await backendCommand.click(infinityMatches[0]!, { times: 2 }, token);

  const confirm = await backendCommand.findHSV(
    BEGIN_MATCH,
    UI_HSV_LOWER,
    UI_HSV_UPPER,
    { timeoutMs: INIT_CONFIRM_TIMEOUT_MS },
    token
  );
  if (confirm.length === 0) {
    throw new Error(
      "summoning - init: begin_match did not appear after double-click infinity"
    );
  }
  logger.log("summoning - init: begin_match confirmed after endless select");
};

const detectBoardCircle = async (
  token: CancellationToken
): Promise<{ cy: number; radius: number; tiles: number }> => {
  const tiles = await backendCommand.isVisibleHSV(
    GAME_BOARD,
    BOARD_HSV_LOWER,
    BOARD_HSV_UPPER,
    undefined,
    token
  );
  const geometry = computeBoardYRange(tiles);
  if (!geometry) {
    throw new Error(
      `summoning - board: only ${tiles.length} tile(s) matched - template broken or not on board`
    );
  }
  if (geometry.radius < MIN_RADIUS_PX) {
    throw new Error(
      `summoning - board: radius ${geometry.radius}px below MIN_RADIUS_PX (${MIN_RADIUS_PX}) - degenerate circle`
    );
  }
  logger.log(
    `summoning - board: y=[${geometry.yMin},${geometry.yMax}] radius=${geometry.radius} tiles=${tiles.length}`
  );
  return { cy: geometry.cy, radius: geometry.radius, tiles: tiles.length };
};

const startMatch = async (token: CancellationToken): Promise<void> => {
  const beginMatch = await backendCommand.findHSV(
    BEGIN_MATCH,
    UI_HSV_LOWER,
    UI_HSV_UPPER,
    undefined,
    token
  );
  if (beginMatch.length === 0) {
    throw new Error("summoning - start: begin_match button not found");
  }
  logger.log("summoning - start: clicking begin_match");
  await backendCommand.click(beginMatch[0]!, undefined, token);
};

const dragUntilChestVisible = async (
  cy: number,
  radius: number,
  token: CancellationToken
): Promise<Point> => {
  const circle = generateCirclePoints(BOARD_CENTER_X, cy, radius);
  let iteration = 0;
  while (true) {
    token.throwIfCancelled();
    iteration++;
    await backendCommand.dragPath(circle, undefined, token);
    const chest = await backendCommand.isVisibleHSV(
      CHEST,
      UI_HSV_LOWER,
      UI_HSV_UPPER,
      undefined,
      token
    );
    if (chest.length > 0) {
      logger.log(
        `summoning - drag: chest visible after iteration ${iteration} at ${chest[0]!.x},${chest[0]!.y}`
      );
      return chest[0]!;
    }
    logger.log(`summoning - drag: iteration ${iteration} - chest not visible`);
  }
};

const collectChest = async (
  chestPoint: Point,
  token: CancellationToken
): Promise<void> => {
  logger.log(
    `summoning - chest: clicking fixed point ${chestPoint.x},${chestPoint.y} until menu returns`
  );
  const start = Date.now();
  while (true) {
    token.throwIfCancelled();
    if (Date.now() - start > CHEST_COLLECTION_TIMEOUT_MS) {
      throw new Error(
        `summoning - chest: collection timed out after ${CHEST_COLLECTION_TIMEOUT_MS}ms`
      );
    }
    const menuBack = await backendCommand.isVisibleHSV(
      INFINITY_ICON,
      UI_HSV_LOWER,
      UI_HSV_UPPER,
      undefined,
      token
    );
    if (menuBack.length > 0) {
      logger.log("summoning - chest: infinity visible - back at menu");
      return;
    }
    await backendCommand.click(chestPoint, undefined, token);
    await delay(CHEST_CLICK_DELAY_MS, token);
  }
};

export const summoningStartEndless = defineScript({
  id: "world6.summoning.startEndlessAutobattler",
  name: "Endless Autobattler",
  run: async ({ token }) => {
    logger.log("summoning - starting endless autobattler loop");
    let round = 0;
    while (!token.isCancelled()) {
      token.throwIfCancelled();
      round++;
      logger.log(`summoning - round ${round}: init`);

      await ensureBeginMatchScreen(token);
      const { cy, radius } = await detectBoardCircle(token);
      await startMatch(token);
      const chestPoint = await dragUntilChestVisible(cy, radius, token);
      await collectChest(chestPoint, token);

      logger.log(`summoning - round ${round}: complete`);
    }
  },
});

export const summoningStartAutobattler = defineScript({
  id: "world6.summoning.startAutobattler",
  name: "Autobattler",
  run: async ({ token }) => {
    while (!token.isCancelled()) {
      token.throwIfCancelled();
      logger.log("Autobattler iteration...");
      await delay(60_000, token);
    }
  },
});
