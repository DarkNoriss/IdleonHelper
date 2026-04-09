import type { Point, Rect } from "../../../backend/backend-types";

export const FARMING_GRID = {
  X_STEP: 86,
  Y_STEP: 111,
  COLUMNS: 9,
  ROWS: 4,
  FIRST_POSITION: {
    x: 208,
    y: 121,
  },
} as const;

// Bean trading
export const BEAN_TRADING_TICKET_COUNT = 37;

export const STORAGE_CENTER: Point = { x: 377, y: 316 };
export const INVENTORY_CENTER: Point = { x: 788, y: 315 };
export const TICKET_DROP_TARGET: Point = { x: 650, y: 80 };

// Overgrowth detection
export const OVERGROWTH_ROI = {
  Y_OFFSET: 60,
  WIDTH: 96,
  HEIGHT: 32,
} as const;

// Placeholder: full HSV range = no filtering. Calibrate using debug script output
export const OVERGROWTH_HSV_LOWER = { h: 0, s: 0, v: 0 } as const;
export const OVERGROWTH_HSV_UPPER = { h: 180, s: 255, v: 255 } as const;

const FARMING_PATH = "ui/map/world-6/town/farming";

export const OVERGROWTH_TEMPLATES = [
  `${FARMING_PATH}/farming_og_2x`,
  `${FARMING_PATH}/farming_og_4x`,
  `${FARMING_PATH}/farming_og_8x`,
  `${FARMING_PATH}/farming_og_32x`,
  `${FARMING_PATH}/farming_og_64x`,
  `${FARMING_PATH}/farming_og_128x`,
  `${FARMING_PATH}/farming_og_256x`,
  `${FARMING_PATH}/farming_og_512x`,
  `${FARMING_PATH}/farming_og_1024x`,
  `${FARMING_PATH}/farming_og_2048x`,
  `${FARMING_PATH}/farming_og_4096x`,
  `${FARMING_PATH}/farming_og_8192x`,
  `${FARMING_PATH}/farming_og_16384x`,
  `${FARMING_PATH}/farming_og_32768x`,
  `${FARMING_PATH}/farming_og_65536x`,
  `${FARMING_PATH}/farming_og_131072x`,
  `${FARMING_PATH}/farming_og_262144x`,
];

export const MIN_OVERGROWTH_MULTIPLIER = 8;

export const buildOvergrowthRegions = (): Rect[] => {
  const regions: Rect[] = [];
  for (let row = 0; row < FARMING_GRID.ROWS; row++) {
    for (let col = 0; col < FARMING_GRID.COLUMNS; col++) {
      const cropX = FARMING_GRID.FIRST_POSITION.x + col * FARMING_GRID.X_STEP;
      const cropY = FARMING_GRID.FIRST_POSITION.y + row * FARMING_GRID.Y_STEP;
      regions.push({
        x: cropX - Math.floor(OVERGROWTH_ROI.WIDTH / 2),
        y: cropY - OVERGROWTH_ROI.Y_OFFSET - OVERGROWTH_ROI.HEIGHT,
        width: OVERGROWTH_ROI.WIDTH,
        height: OVERGROWTH_ROI.HEIGHT,
      });
    }
  }
  return regions;
};
