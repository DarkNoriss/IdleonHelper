import type { Rect } from "../../../backend/backend-types";

export const SUSHI_GRID = {
  ROWS: 8,
  COLUMNS: 15,
  FIRST_POSITION: { x: 0, y: 0 },
  X_STEP: 0,
  Y_STEP: 0,
} as const;

export const SUSHI_ROI = {
  WIDTH: 0,
  HEIGHT: 0,
} as const;

export const SUSHI_HSV_LOWER = { h: 0, s: 0, v: 0 } as const;
export const SUSHI_HSV_UPPER = { h: 180, s: 255, v: 255 } as const;

const SUSHI_PATH = "ui/map/world-7/sushi-station";

export const SUSHI_TEMPLATES = Array.from(
  { length: 50 },
  (_, i) => `${SUSHI_PATH}/sushi_t${i + 1}`
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
