import type { HsvColor, Point } from "../../../backend/backend-types";

export const ALCHEMY_PATH = "ui/map/world-2/alchemy";

export const ALCHEMY_TAB = `${ALCHEMY_PATH}/alchemy_tab`;
export const ALCHEMY_BREWING_TAB = `${ALCHEMY_PATH}/brewing`;
export const ALCHEMY_ARROW_UP = `${ALCHEMY_PATH}/arrow_up`;
export const ALCHEMY_ARROW_DOWN = `${ALCHEMY_PATH}/arrow_down`;
export const ALCHEMY_UPGRADE_BUTTON = `${ALCHEMY_PATH}/upgrade`;

// Bubble search HSV bounds (stricter V floor - bubble silhouettes are bright).
export const ALCHEMY_HSV_LOWER: HsvColor = { h: 0, s: 0, v: 128 };
export const ALCHEMY_HSV_UPPER: HsvColor = { h: 192, s: 255, v: 255 };

// UI element HSV bounds (looser V floor - preserves thin/dim shape details like
// arrow outlines and the Upgrade button).
export const ALCHEMY_UI_HSV_LOWER: HsvColor = { h: 0, s: 0, v: 1 };
export const ALCHEMY_UI_HSV_UPPER: HsvColor = { h: 192, s: 255, v: 255 };

export const ALCHEMY_CLICKS_PER_BUBBLE = 50;
export const ALCHEMY_PAGES_PER_COLUMN = 8;
export const ALCHEMY_MAX_SCROLLS = ALCHEMY_PAGES_PER_COLUMN - 1;

// Delay between popup-dismiss (Escape) and the next action. Gives the game UI
// a beat to fully close the popup before we search for the next bubble.
export const ALCHEMY_POPUP_DISMISS_DELAY_MS = 300;

export type CauldronKey = "power" | "quicc" | "highIq" | "kazam";

export const CAULDRON_ORDER: readonly CauldronKey[] = [
  "power",
  "quicc",
  "highIq",
  "kazam",
] as const;

// Runtime-detected per-cauldron up-arrow positions. Populated AFTER
// reset-to-page-1 when every cauldron has its up-arrow visible (down-arrow is
// hidden on page-1 columns, so up is the reliable anchor).
export type CauldronUpArrows = Record<CauldronKey, Point>;
