import type { HsvColor, Point } from "../../../backend/backend-types";

/**
 * Static coordinates for the cloudsave flow.
 *
 * Player-selection slot click points are user-supplied (3 columns x 2 rows).
 * Main-menu coords are baked from `general.debug.findCloudsaveCoords` and
 * should only need to be re-captured if the game UI shifts.
 */

// HSV ranges
export const HSV_WHITE_LOWER: HsvColor = { h: 0, s: 0, v: 1 };
export const HSV_WHITE_UPPER: HsvColor = { h: 192, s: 255, v: 255 };

export const HSV_PLAY_LOWER: HsvColor = { h: 0, s: 0, v: 128 };
export const HSV_PLAY_UPPER: HsvColor = { h: 192, s: 255, v: 255 };

// Player-selection slot grid (used to identify which slot currently_playing.png lands in)
export const PLAYER_SELECT_SLOTS: readonly Point[] = [
  { x: 320, y: 195 }, // 1
  { x: 510, y: 195 }, // 2
  { x: 690, y: 195 }, // 3
  { x: 320, y: 330 }, // 4
  { x: 510, y: 330 }, // 5
  { x: 690, y: 330 }, // 6
] as const;

export const SLOTS_PER_PAGE = 6;
export const SLOT_TOLERANCE_PX = 20;

// Main-menu static coords - captured via general.debug.findCloudsaveCoords.
// Re-run that script if the layout shifts.
export const MAIN_MENU_PAGE_BACK: Point = { x: 817, y: 539 };
export const MAIN_MENU_PAGE_NEXT: Point = { x: 918, y: 538 };
export const MAIN_MENU_PLAY: Point = { x: 910, y: 423 };

// Six characters per page, single row left-to-right.
export const MAIN_MENU_FEET: readonly Point[] = [
  { x: 68, y: 459 }, // 1
  { x: 194, y: 459 }, // 2
  { x: 320, y: 459 }, // 3
  { x: 446, y: 459 }, // 4
  { x: 572, y: 459 }, // 5
  { x: 698, y: 459 }, // 6
] as const;
