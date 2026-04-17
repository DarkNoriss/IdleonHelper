import type { Selections } from "@/types/alchemy";
import type { Point } from "../../../backend/backend-types";
import {
  backendCommand,
  getClickOptionsFromPreset,
} from "../../../backend/index";
import type { CancellationToken } from "../../../utils/cancellation-token";
import { delay, logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import { navigation } from "../../game-nav/index";
import { pressKey } from "../../keys";
import {
  ALCHEMY_ARROW_DOWN,
  ALCHEMY_ARROW_UP,
  ALCHEMY_CLICKS_PER_BUBBLE,
  ALCHEMY_HSV_LOWER,
  ALCHEMY_HSV_UPPER,
  ALCHEMY_MAX_SCROLLS,
  ALCHEMY_PAGE_SETTLE_DELAY_MS,
  ALCHEMY_PAGES_PER_COLUMN,
  ALCHEMY_POPUP_DISMISS_DELAY_MS,
  ALCHEMY_UI_HSV_LOWER,
  ALCHEMY_UI_HSV_UPPER,
  ALCHEMY_UPGRADE_BUTTON,
  CAULDRON_ORDER,
  type CauldronKey,
  type CauldronUpArrows,
} from "./alchemy-upgrade-constants";

const CLICK_OPTIONS_16X = getClickOptionsFromPreset("16x");

// Reset every cauldron already showing a DOWN arrow to page 1. Columns already
// on page 1 hide their DOWN arrow, so finding only 3 (or 2, or 0) is normal —
// the un-matched columns don't need resetting.
const resetAllColumnsToFirstPage = async (
  token: CancellationToken
): Promise<void> => {
  const downs = await backendCommand.findHSV(
    ALCHEMY_ARROW_DOWN,
    ALCHEMY_UI_HSV_LOWER,
    ALCHEMY_UI_HSV_UPPER,
    undefined,
    token
  );
  const clicksPerColumn = ALCHEMY_PAGES_PER_COLUMN - 1;
  logger.log(
    `alchemy-upgrade - reset - ${downs.length} column(s) not on page 1, clicking down-arrow ${clicksPerColumn}x on each`
  );
  for (const downArrow of downs) {
    await backendCommand.click(
      downArrow,
      { ...CLICK_OPTIONS_16X, times: clicksPerColumn },
      token
    );
  }
  if (downs.length > 0) {
    await delay(ALCHEMY_PAGE_SETTLE_DELAY_MS, token);
  }
};

// After reset-to-page-1, all four up-arrows should be visible. Sort by x and
// pair with CAULDRON_ORDER so we can scroll specific cauldrons up between
// search attempts.
const detectUpArrows = async (
  token: CancellationToken
): Promise<CauldronUpArrows | null> => {
  const ups = await backendCommand.findHSV(
    ALCHEMY_ARROW_UP,
    ALCHEMY_UI_HSV_LOWER,
    ALCHEMY_UI_HSV_UPPER,
    undefined,
    token
  );
  const expected = CAULDRON_ORDER.length;
  if (ups.length !== expected) {
    logger.log(
      `alchemy-upgrade - expected ${expected} up arrows after reset, got ${ups.length} - aborting`
    );
    return null;
  }
  const sorted = [...ups].sort((a, b) => a.x - b.x);
  const result = {} as CauldronUpArrows;
  for (let i = 0; i < CAULDRON_ORDER.length; i++) {
    result[CAULDRON_ORDER[i]!] = sorted[i]!;
  }
  logger.log(
    `alchemy-upgrade - up arrows: ${CAULDRON_ORDER.map((k) => `${k}@(${result[k].x},${result[k].y})`).join(" ")}`
  );
  return result;
};

const scrollColumnUp = async (
  key: CauldronKey,
  upArrows: CauldronUpArrows,
  token: CancellationToken
): Promise<void> => {
  await backendCommand.click(upArrows[key], CLICK_OPTIONS_16X, token);
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

  await backendCommand.click(
    upgradeFound[0]!,
    { ...CLICK_OPTIONS_16X, times: ALCHEMY_CLICKS_PER_BUBBLE },
    token
  );

  await pressKey("ESCAPE", token);
  await delay(ALCHEMY_POPUP_DISMISS_DELAY_MS, token);
  return true;
};

const searchAndUpgrade = async (
  outstanding: Map<CauldronKey, string>,
  upArrows: CauldronUpArrows,
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

    const matches = await backendCommand.isVisibleHSVParallel(
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
        await scrollColumnUp(key, upArrows, token);
      }
      await delay(ALCHEMY_PAGE_SETTLE_DELAY_MS, token);
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

    const opened = await navigation.alchemy.toBrewing(token);
    if (!opened) {
      logger.log("alchemy-upgrade - navigation to brewing failed, exiting");
      return;
    }

    await resetAllColumnsToFirstPage(token);

    const upArrows = await detectUpArrows(token);
    if (!upArrows) {
      return;
    }

    await searchAndUpgrade(outstanding, upArrows, token);

    logger.log("alchemy-upgrade - finished");
  },
});
