import type {
  HsvColor,
  Point,
  ScreenOffset,
} from "../../../backend/backend-types";

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
  searchRegion: ScreenOffset;
};

// Operator fills these once the HSV capture tool has been used to locate the
// exact pixel positions. Zeros are placeholders that will NOT match any region
// and will cause the script to log a "not found" failure until updated.
export const CAULDRON_LAYOUTS: Record<CauldronKey, CauldronLayout> = {
  power: {
    upArrow: { x: 0, y: 0 },
    downArrow: { x: 0, y: 0 },
    searchRegion: { left: 0, right: 0, top: 0, bottom: 0 },
  },
  quicc: {
    upArrow: { x: 0, y: 0 },
    downArrow: { x: 0, y: 0 },
    searchRegion: { left: 0, right: 0, top: 0, bottom: 0 },
  },
  highIq: {
    upArrow: { x: 0, y: 0 },
    downArrow: { x: 0, y: 0 },
    searchRegion: { left: 0, right: 0, top: 0, bottom: 0 },
  },
  kazam: {
    upArrow: { x: 0, y: 0 },
    downArrow: { x: 0, y: 0 },
    searchRegion: { left: 0, right: 0, top: 0, bottom: 0 },
  },
};
