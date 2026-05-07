import type {
  HsvColor,
  Point,
  ScreenOffset,
} from "../../../backend/backend-types";

export const ALCHEMY_PATH = "ui/map/world-2/alchemy";

export const ALCHEMY_TAB = `${ALCHEMY_PATH}/alchemy_tab`;
export const ALCHEMY_EXIT = `${ALCHEMY_PATH}/exit`;
export const ALCHEMY_BREWING_TAB = `${ALCHEMY_PATH}/brewing`;
export const ALCHEMY_BREWING_OFF = `${ALCHEMY_PATH}/brewing_off`;
export const ALCHEMY_BREWING_BG = `${ALCHEMY_PATH}/brewing_bg`;
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

export const ALCHEMY_CLICKS_PER_BUBBLE = 100;
export const ALCHEMY_PAGES_PER_COLUMN = 8;
export const ALCHEMY_MAX_SCROLLS = ALCHEMY_PAGES_PER_COLUMN - 1;

// Delay between popup-dismiss (Escape) and the next action. Gives the game UI
// a beat to fully close the popup before we search for the next bubble.
export const ALCHEMY_POPUP_DISMISS_DELAY_MS = 300;

// Delay after a page transition (reset or scroll-up) before matching bubbles
// again. Bubbles animate into position on page change, and matching against an
// in-flight animation produces wrong Points or misses entirely.
export const ALCHEMY_PAGE_SETTLE_DELAY_MS = 1000;

export type CauldronKey = "power" | "quicc" | "highIq" | "kazam";

export const CAULDRON_ORDER: readonly CauldronKey[] = [
  "power",
  "quicc",
  "highIq",
  "kazam",
] as const;

// Per-cauldron x-range gates passed as ScreenOffset to HSV searches. Bubble
// silhouettes can look identical across cauldrons (e.g. EXP-style bubbles in
// kazam vs damage bubbles in power), so each search is constrained to the
// owning column's x-band to prevent cross-column false matches.
//
// ScreenOffset semantics (per backend FilterMatchesByOffset):
//   left  -> inclusive min X; 0 = no lower bound
//   right -> inclusive max X; 0 = no upper bound
export const CAULDRON_OFFSETS: Record<CauldronKey, ScreenOffset> = {
  power: { left: 0, right: 200, top: 0, bottom: 0 },
  quicc: { left: 200, right: 385, top: 0, bottom: 0 },
  highIq: { left: 385, right: 570, top: 0, bottom: 0 },
  kazam: { left: 570, right: 765, top: 0, bottom: 0 },
};

// Runtime-detected per-cauldron up-arrow positions. Populated AFTER
// reset-to-page-1 when every cauldron has its up-arrow visible (down-arrow is
// hidden on page-1 columns, so up is the reliable anchor).
export type CauldronUpArrows = Record<CauldronKey, Point>;
