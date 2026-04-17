import type { HsvColor } from "../../../backend/backend-types";

export const SUMMONING_PATH = "ui/map/world-6/summoning";

export const GAME_BOARD = `${SUMMONING_PATH}/game_board`;
export const BEGIN_MATCH = `${SUMMONING_PATH}/begin_match`;
export const INFINITY_ICON = `${SUMMONING_PATH}/infinity`;
export const CHEST = `${SUMMONING_PATH}/chest`;
export const SUMMONING_ICON = `${SUMMONING_PATH}/summoning`;

// Board template HSV range (near-white tile interiors)
export const BOARD_HSV_LOWER: HsvColor = { h: 0, s: 0, v: 120 };
export const BOARD_HSV_UPPER: HsvColor = { h: 180, s: 255, v: 255 };

// Shared UI HSV range for begin_match, infinity, chest templates
export const UI_HSV_LOWER: HsvColor = { h: 0, s: 0, v: 128 };
export const UI_HSV_UPPER: HsvColor = { h: 192, s: 255, v: 255 };

// Board detection guards
export const MIN_BOARD_MATCHES = 3;
export const MIN_RADIUS_PX = 20;

// Outlier filter - drop matches whose Y deviation from the median exceeds
// OUTLIER_MAD_MULTIPLIER * MAD (median absolute deviation). The min-spread
// floor prevents the filter from rejecting a tight cluster when MAD is near 0.
export const OUTLIER_MAD_MULTIPLIER = 3;
export const OUTLIER_MIN_SPREAD_PX = 10;

// Circle drag
export const CIRCLE_WAYPOINTS = 36;

// Timings (ms)
export const INIT_CONFIRM_TIMEOUT_MS = 3000;
export const INFINITY_POST_CLICK_DELAY_MS = 1000;
export const CHEST_CLICK_DELAY_MS = 150;
export const CHEST_COLLECTION_TIMEOUT_MS = 15_000;
