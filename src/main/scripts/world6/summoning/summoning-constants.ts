import type { ClickPreset } from "../../../backend/backend-config";
import type { HsvColor } from "../../../backend/backend-types";

export const SUMMONING_PATH = "ui/map/world-6/summoning";

export const GAME_BOARD = `${SUMMONING_PATH}/game_board`;
export const BEGIN_MATCH = `${SUMMONING_PATH}/begin_match`;
export const INFINITY_ICON = `${SUMMONING_PATH}/infinity`;
export const CHEST = `${SUMMONING_PATH}/chest`;
export const SUMMONING_ICON = `${SUMMONING_PATH}/summoning`;
export const BOARD = `${SUMMONING_PATH}/board`;

// Board template HSV range (near-white tile interiors)
export const BOARD_HSV_LOWER: HsvColor = { h: 0, s: 0, v: 120 };
export const BOARD_HSV_UPPER: HsvColor = { h: 180, s: 255, v: 255 };

// Shared UI HSV range for begin_match, infinity, chest templates
export const UI_HSV_LOWER: HsvColor = { h: 0, s: 0, v: 128 };
export const UI_HSV_UPPER: HsvColor = { h: 192, s: 255, v: 255 };

// Board detection guards
export const MIN_BOARD_MATCHES = 3;
export const MIN_RADIUS_PX = 20;

// X coordinate for every spawn click. Static, near enemy spawn so each click
// also damages enemies (spawn-camp) while spawning our unit from the left.
export const CLICK_X = 740;
// Clicks per batch before re-checking for the chest.
export const CLICK_BATCH_SIZE = 50;
// Minimum Y gap between any two clicks in a batch - prevents clumping.
export const MIN_Y_SPACING = 10;
// Speed preset applied to every click in the batch.
export const CLICK_SPEED_PRESET: ClickPreset = "16x";

// Outlier filter - drop matches whose Y deviation from the median exceeds
// OUTLIER_MAD_MULTIPLIER * MAD (median absolute deviation). The min-spread
// floor prevents the filter from rejecting a tight cluster when MAD is near 0.
export const OUTLIER_MAD_MULTIPLIER = 3;
export const OUTLIER_MIN_SPREAD_PX = 10;

// Timings (ms)
export const INIT_CONFIRM_TIMEOUT_MS = 3000;
export const CHEST_CLICK_DELAY_MS = 150;
export const CHEST_COLLECTION_TIMEOUT_MS = 15_000;
export const POST_CHEST_DELAY_MS = 5000;
