import type { Rect } from "../../../backend/backend-types";

export const SUSHI_GRID = {
  ROWS: 8,
  COLUMNS: 15,
  FIRST_POSITION: { x: 49, y: 85 },
  X_STEP: 47,
  Y_STEP: 47,
} as const;

export const SUSHI_ROI = {
  WIDTH: 41,
  HEIGHT: 41,
} as const;

export const SUSHI_HSV_LOWER = { h: 0, s: 0, v: 120 } as const;
export const SUSHI_HSV_UPPER = { h: 180, s: 255, v: 255 } as const;

const SUSHI_PATH = "ui/map/world-7/sushi-station";

export const SUSHI_TIERS_ON = `${SUSHI_PATH}/sushi_tiers`;
export const SUSHI_TIERS_OFF = `${SUSHI_PATH}/sushi_tiers_off`;
export const SUSHI_COOK = `${SUSHI_PATH}/sushi_cook`;

const SUSHI_TIERS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

export const SUSHI_TEMPLATES = SUSHI_TIERS.map(
  (t) => `${SUSHI_PATH}/sushi_t${t}`
);

export const buildSushiRegions = (): Rect[] => {
  const regions: Rect[] = [];
  for (let row = 0; row < SUSHI_GRID.ROWS; row++) {
    for (let col = 0; col < SUSHI_GRID.COLUMNS; col++) {
      const cellX = SUSHI_GRID.FIRST_POSITION.x + col * SUSHI_GRID.X_STEP;
      const cellY = SUSHI_GRID.FIRST_POSITION.y + row * SUSHI_GRID.Y_STEP;
      regions.push({
        x: cellX - Math.floor(SUSHI_ROI.WIDTH / 2),
        y: cellY - Math.floor(SUSHI_ROI.HEIGHT / 2),
        width: SUSHI_ROI.WIDTH,
        height: SUSHI_ROI.HEIGHT,
      });
    }
  }
  return regions;
};
