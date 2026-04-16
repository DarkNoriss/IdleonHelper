import type { Selections } from "@/types/alchemy";
import type { Point } from "../../../backend/backend-types";
import {
  backendCommand,
  getClickOptionsFromPreset,
} from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { delay, logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { pressKey } from "../../keys";
import {
  ALCHEMY_ARROW_DOWN,
  ALCHEMY_ARROW_UP,
  ALCHEMY_BREWING_TAB,
  ALCHEMY_CLICKS_PER_BUBBLE,
  ALCHEMY_HSV_LOWER,
  ALCHEMY_HSV_UPPER,
  ALCHEMY_MAX_SCROLLS,
  ALCHEMY_PAGES_PER_COLUMN,
  ALCHEMY_POPUP_DISMISS_DELAY_MS,
  ALCHEMY_TAB,
  ALCHEMY_UI_HSV_LOWER,
  ALCHEMY_UI_HSV_UPPER,
  ALCHEMY_UPGRADE_BUTTON,
  CAULDRON_ORDER,
  type CauldronArrows,
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

const detectArrows = async (
  token: CancellationToken
): Promise<CauldronArrows | null> => {
  logger.log("alchemy-upgrade - detecting arrow positions");
  const ups = await backendCommand.findHSV(
    ALCHEMY_ARROW_UP,
    ALCHEMY_UI_HSV_LOWER,
    ALCHEMY_UI_HSV_UPPER,
    undefined,
    token
  );
  const downs = await backendCommand.findHSV(
    ALCHEMY_ARROW_DOWN,
    ALCHEMY_UI_HSV_LOWER,
    ALCHEMY_UI_HSV_UPPER,
    undefined,
    token
  );

  const expected = CAULDRON_ORDER.length;
  if (ups.length !== expected || downs.length !== expected) {
    logger.log(
      `alchemy-upgrade - expected ${expected} up and ${expected} down arrows, got ${ups.length} up and ${downs.length} down - aborting`
    );
    return null;
  }

  const sortedUps = [...ups].sort((a, b) => a.x - b.x);
  const sortedDowns = [...downs].sort((a, b) => a.x - b.x);

  const arrows = {} as CauldronArrows;
  for (let i = 0; i < CAULDRON_ORDER.length; i++) {
    const key = CAULDRON_ORDER[i]!;
    arrows[key] = { up: sortedUps[i]!, down: sortedDowns[i]! };
  }

  logger.log(
    `alchemy-upgrade - arrows detected: ${CAULDRON_ORDER.map((k) => `${k}@up(${arrows[k].up.x},${arrows[k].up.y}) down(${arrows[k].down.x},${arrows[k].down.y})`).join(" ")}`
  );
  return arrows;
};

const resetColumnsToFirstPage = async (
  keys: readonly CauldronKey[],
  arrows: CauldronArrows,
  token: CancellationToken
): Promise<void> => {
  const clicksPerColumn = ALCHEMY_PAGES_PER_COLUMN - 1;
  logger.log(
    `alchemy-upgrade - reset - clicking down-arrow ${clicksPerColumn}x on ${keys.length} column(s)`
  );
  for (const key of keys) {
    await backendCommand.click(
      arrows[key].down,
      { times: clicksPerColumn },
      token
    );
  }
};

const scrollColumnUp = async (
  key: CauldronKey,
  arrows: CauldronArrows,
  token: CancellationToken
): Promise<void> => {
  await backendCommand.click(arrows[key].up, undefined, token);
};

const clickBubbleAndBurstUpgrade = async (
  bubblePoint: Point,
  token: CancellationToken
): Promise<boolean> => {
  await backendCommand.click(bubblePoint, undefined, token);

  const upgradeFound = await backendCommand.findHSV(
    ALCHEMY_UPGRADE_BUTTON,
    ALCHEMY_UI_HSV_LOWER,
    ALCHEMY_UI_HSV_UPPER,
    undefined,
    token
  );
  if (upgradeFound.length === 0) {
    logger.log("alchemy-upgrade - upgrade button not found after bubble click");
    await pressKey("ESCAPE", token);
    await delay(ALCHEMY_POPUP_DISMISS_DELAY_MS, token);
    return false;
  }

  const clickOptions = getClickOptionsFromPreset("16x");
  await backendCommand.click(
    upgradeFound[0]!,
    { ...clickOptions, times: ALCHEMY_CLICKS_PER_BUBBLE },
    token
  );

  await pressKey("ESCAPE", token);
  await delay(ALCHEMY_POPUP_DISMISS_DELAY_MS, token);
  return true;
};

const searchAndUpgrade = async (
  outstanding: Map<CauldronKey, string>,
  arrows: CauldronArrows,
  token: CancellationToken
): Promise<void> => {
  for (let attempt = 0; attempt <= ALCHEMY_MAX_SCROLLS; attempt++) {
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
      const first = matches[key]?.[0];
      if (!first) {
        continue;
      }
      logger.log(
        `alchemy-upgrade - ${key} matched ${path} at ${first.x},${first.y} - bursting upgrade ${ALCHEMY_CLICKS_PER_BUBBLE}x`
      );
      const upgraded = await clickBubbleAndBurstUpgrade(first, token);
      if (upgraded) {
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
        await scrollColumnUp(key, arrows, token);
      }
    }
  }

  for (const key of outstanding.keys()) {
    logger.log(
      `alchemy-upgrade - ${key} bubble not found after ${ALCHEMY_MAX_SCROLLS} scrolls`
    );
  }
};

export default defineScript<[Selections, number]>({
  id: "world2.alchemyUpgrade.run",
  name: "Alchemy - Upgrade Bubbles",
  recurring: {
    intervalFromArgs: ([, intervalMinutes]) => intervalMinutes * 60 * 1000,
  },
  run: async ({ token, args: [selections, intervalMinutes] }) => {
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
      `alchemy-upgrade - starting with ${outstanding.size} selection(s): ${Array.from(outstanding.keys()).join(", ")} (every ${intervalMinutes} min)`
    );

    const opened = await openAlchemyBrewing(token);
    if (!opened) {
      return;
    }

    const arrows = await detectArrows(token);
    if (!arrows) {
      return;
    }

    await resetColumnsToFirstPage(
      Array.from(outstanding.keys()),
      arrows,
      token
    );
    await searchAndUpgrade(outstanding, arrows, token);

    logger.log("alchemy-upgrade - finished");
  },
});
