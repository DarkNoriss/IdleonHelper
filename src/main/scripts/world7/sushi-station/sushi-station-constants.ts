import type { Point, Rect, RegionResult } from "../../../backend/backend-types";

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
export const GRID_SLOT = `${SUSHI_PATH}/grid_slot`;
export const GRID_SLOT_RED = `${SUSHI_PATH}/grid_slot_red`;
export const GRID_SLOT_YELLOW = `${SUSHI_PATH}/grid_slot_yellow`;

const SUSHI_TIERS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25, 26, 27, 28, 29, 30,
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

export const pointToCellIndex = (point: Point): number | null => {
  const relX = point.x - SUSHI_GRID.FIRST_POSITION.x;
  const relY = point.y - SUSHI_GRID.FIRST_POSITION.y;

  const col = Math.round(relX / SUSHI_GRID.X_STEP);
  const row = Math.round(relY / SUSHI_GRID.Y_STEP);

  if (col < 0 || col >= SUSHI_GRID.COLUMNS) {
    return null;
  }
  if (row < 0 || row >= SUSHI_GRID.ROWS) {
    return null;
  }

  return row * SUSHI_GRID.COLUMNS + col;
};

// Snake-forward, top-left first. priorityCells[0] = first available cell
// scanning rows top-to-bottom, columns left-to-right. The sort assigns the
// highest-tier sushi to priorityCells[0], so the board ends up
// descending from top-left — the layout Wind of the East needs to chain.
export const getPriorityCells = (
  availableCells: ReadonlySet<number>
): number[] => {
  const result: number[] = [];
  for (let row = 0; row < SUSHI_GRID.ROWS; row++) {
    for (let col = 0; col < SUSHI_GRID.COLUMNS; col++) {
      const cell = row * SUSHI_GRID.COLUMNS + col;
      if (availableCells.has(cell)) {
        result.push(cell);
      }
    }
  }
  return result;
};

const TIER_REGEX = /sushi_t(\d+)/;

// match is the template filename stem from the backend (e.g. sushi_t12), not a path.
export const parseTierNumber = (match: string): number | null => {
  const m = TIER_REGEX.exec(match);
  if (!m) {
    return null;
  }
  const parsed = Number.parseInt(m[1]!, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const countEmptyCells = (
  results: RegionResult[],
  availableCells: ReadonlySet<number>
): number => {
  const occupied = new Set<number>();
  for (const r of results) {
    if (r.match !== null) {
      occupied.add(r.regionIndex);
    }
  }
  let empty = 0;
  for (const cell of availableCells) {
    if (!occupied.has(cell)) {
      empty++;
    }
  }
  return empty;
};
