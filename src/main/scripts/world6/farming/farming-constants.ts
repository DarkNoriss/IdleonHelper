import type { Point } from "../../../backend/backend-types";

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
export const TICKET_DROP_TARGET: Point = { x: 0, y: 0 };
