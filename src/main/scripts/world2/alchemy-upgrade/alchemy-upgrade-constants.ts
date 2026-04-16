import type { HsvColor, Point } from "../../../backend/backend-types";

export const ALCHEMY_PATH = "ui/map/world-2/alchemy";

export const ALCHEMY_TAB = `${ALCHEMY_PATH}/alchemy_tab`;
export const ALCHEMY_BREWING_TAB = `${ALCHEMY_PATH}/brewing`;

export const ALCHEMY_HSV_LOWER: HsvColor = { h: 0, s: 0, v: 120 };
export const ALCHEMY_HSV_UPPER: HsvColor = { h: 180, s: 255, v: 255 };

export const ALCHEMY_CLICKS_PER_BUBBLE = 50;
export const ALCHEMY_PAGES_PER_COLUMN = 8;
export const ALCHEMY_MAX_SCROLLS = ALCHEMY_PAGES_PER_COLUMN - 1;

export type CauldronKey = "power" | "quicc" | "highIq" | "kazam";

export const CAULDRON_ORDER: readonly CauldronKey[] = [
  "power",
  "quicc",
  "highIq",
  "kazam",
] as const;

export type CauldronLayout = {
  upArrow: Point;
  downArrow: Point;
};

// Operator fills these up-arrow and down-arrow pixel positions once the HSV
// capture tool has been used to locate them. Zero placeholders click the top-
// left corner and fail silently, so the script will log "not found" until
// updated.
export const CAULDRON_LAYOUTS: Record<CauldronKey, CauldronLayout> = {
  power: {
    upArrow: { x: 0, y: 0 },
    downArrow: { x: 0, y: 0 },
  },
  quicc: {
    upArrow: { x: 0, y: 0 },
    downArrow: { x: 0, y: 0 },
  },
  highIq: {
    upArrow: { x: 0, y: 0 },
    downArrow: { x: 0, y: 0 },
  },
  kazam: {
    upArrow: { x: 0, y: 0 },
    downArrow: { x: 0, y: 0 },
  },
};
