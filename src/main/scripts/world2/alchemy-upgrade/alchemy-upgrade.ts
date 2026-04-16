import type { Selections } from "@/types/alchemy";
import type { Point } from "../../../backend/backend-types";
import {
  backendCommand,
  getClickOptionsFromPreset,
} from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  ALCHEMY_BREWING_TAB,
  ALCHEMY_CLICKS_PER_BUBBLE,
  ALCHEMY_HSV_LOWER,
  ALCHEMY_HSV_UPPER,
  ALCHEMY_MAX_SCROLLS,
  ALCHEMY_PAGES_PER_COLUMN,
  ALCHEMY_TAB,
  CAULDRON_LAYOUTS,
  CAULDRON_ORDER,
  type CauldronKey,
} from "./alchemy-upgrade-constants";

const openAlchemyBrewing = async (
  token: CancellationToken
): Promise<boolean> => {
  logger.log("alchemy-upgrade - opening alchemy tab");
  const alchemyFound = await backendCommand.find(ALCHEMY_TAB, undefined, token);
  if (alchemyFound.length === 0) {
    logger.log("alchemy-upgrade - alchemy tab not found");
    return false;
  }
  await backendCommand.click(alchemyFound[0]!, undefined, token);

  logger.log("alchemy-upgrade - opening brewing sub-tab");
  const brewingFound = await backendCommand.find(
    ALCHEMY_BREWING_TAB,
    undefined,
    token
  );
  if (brewingFound.length === 0) {
    logger.log("alchemy-upgrade - brewing tab not found");
    return false;
  }
  await backendCommand.click(brewingFound[0]!, undefined, token);
  return true;
};

const resetColumnsToFirstPage = async (
  keys: readonly CauldronKey[],
  token: CancellationToken
): Promise<void> => {
  const clicksPerColumn = ALCHEMY_PAGES_PER_COLUMN - 1;
  logger.log(
    `alchemy-upgrade - reset - clicking down-arrow ${clicksPerColumn}x on ${keys.length} column(s)`
  );
  for (const key of keys) {
    const { downArrow } = CAULDRON_LAYOUTS[key];
    await backendCommand.click(downArrow, { times: clicksPerColumn }, token);
  }
};

const clickBubble = async (
  point: Point,
  token: CancellationToken
): Promise<void> => {
  const clickOptions = getClickOptionsFromPreset("16x");
  await backendCommand.click(
    point,
    { ...clickOptions, times: ALCHEMY_CLICKS_PER_BUBBLE },
    token
  );
};

const scrollColumnUp = async (
  key: CauldronKey,
  token: CancellationToken
): Promise<void> => {
  const { upArrow } = CAULDRON_LAYOUTS[key];
  await backendCommand.click(upArrow, undefined, token);
};

const searchAndUpgrade = async (
  outstanding: Map<CauldronKey, string>,
  token: CancellationToken
): Promise<void> => {
  for (let attempt = 0; attempt <= ALCHEMY_MAX_SCROLLS; attempt++) {
    if (outstanding.size === 0) {
      return;
    }

    const templates: Record<string, string> = {};
    for (const [key, path] of outstanding) {
      templates[key] = path;
    }

    logger.log(
      `alchemy-upgrade - attempt ${attempt + 1}/${ALCHEMY_MAX_SCROLLS + 1} - searching ${outstanding.size} column(s)`
    );

    const matches = await backendCommand.findHSVParallel(
      templates,
      ALCHEMY_HSV_LOWER,
      ALCHEMY_HSV_UPPER,
      undefined,
      token
    );

    const resolved: CauldronKey[] = [];
    for (const [key, path] of outstanding) {
      const points = matches[key];
      if (points && points.length > 0) {
        logger.log(
          `alchemy-upgrade - ${key} matched ${path} at ${points[0]!.x},${points[0]!.y} - clicking ${ALCHEMY_CLICKS_PER_BUBBLE}x`
        );
        await clickBubble(points[0]!, token);
        resolved.push(key);
      }
    }

    for (const key of resolved) {
      outstanding.delete(key);
    }

    if (outstanding.size === 0) {
      logger.log("alchemy-upgrade - all selections resolved");
      return;
    }

    if (attempt < ALCHEMY_MAX_SCROLLS) {
      logger.log(
        `alchemy-upgrade - scrolling up ${outstanding.size} unresolved column(s)`
      );
      for (const key of outstanding.keys()) {
        await scrollColumnUp(key, token);
      }
    }
  }

  for (const key of outstanding.keys()) {
    logger.log(
      `alchemy-upgrade - ${key} bubble not found after ${ALCHEMY_MAX_SCROLLS} scrolls`
    );
  }
};

export default defineScript<[Selections]>({
  id: "world2.alchemyUpgrade.run",
  name: "Alchemy - Upgrade Bubbles",
  run: async ({ token, args: [selections] }) => {
    const outstanding = new Map<CauldronKey, string>();
    for (const key of CAULDRON_ORDER) {
      const value = selections[key];
      if (value !== null && value !== "") {
        outstanding.set(key, value);
      }
    }

    if (outstanding.size === 0) {
      logger.log("alchemy-upgrade - no bubbles selected, exiting");
      return;
    }

    logger.log(
      `alchemy-upgrade - starting with ${outstanding.size} selection(s): ${Array.from(outstanding.keys()).join(", ")}`
    );

    const opened = await openAlchemyBrewing(token);
    if (!opened) {
      return;
    }

    await resetColumnsToFirstPage(Array.from(outstanding.keys()), token);
    await searchAndUpgrade(outstanding, token);

    logger.log("alchemy-upgrade - finished");
  },
});
