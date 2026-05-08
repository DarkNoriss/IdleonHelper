import type { HsvColor } from "../../../backend/backend-types";

export const W6_BOSS_HSV: { hsvLower: HsvColor; hsvUpper: HsvColor } = {
  hsvLower: { h: 0, s: 0, v: 128 },
  hsvUpper: { h: 192, s: 255, v: 255 },
};

export const ENTER_POINT = { x: 220, y: 480 } as const;
export const EXIT_BUTTON_POINT = { x: 25, y: 480 } as const;
export const PORTAL_POINT = { x: 30, y: 420 } as const;

export const POST_ENTER_DELAY_MS = 3000;
export const POST_LINE_DELAY_MS = 3000;
export const POST_EXIT_DELAY_MS = 3000;
export const POST_PORTAL_DELAY_MS = 3000;

export const EMPEROR_POLL_MS = 250;
export const EMPEROR_DEAD_CONFIRMS = 20;
