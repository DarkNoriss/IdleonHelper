import type { HsvColor, Point } from "../../../backend/backend-types";

// Geometry shared across class-specific upgrader panels (tesseract, grimoire,
// ...). All panels show 8 rows per page and snap per-row, but the total row
// count differs per skill (tesseract=63, grimoire=55) - which changes both
// MAX_TOP_ROW and SCROLL_PITCH. Locked rows still occupy their slot
// (rendered as "just X more upgrades..." placeholders), so
// list-position == upgrade index within each skill's panel.

export const UPGRADER_VISIBLE_ROWS = 8;

// Click coords for the inline upgrade button. X is derived from scrollbarX
// (the upgrade button is at a fixed offset left of the scrollbar within each
// panel - the panel widths differ but the column layout is the same). Y
// mapping is linear from row 0 (105) to row 7 (463) within the visible page.
export const UPGRADER_FIRST_ROW_Y = 105;
export const UPGRADER_LAST_ROW_Y = 463;
export const UPGRADER_ROW_PITCH =
  (UPGRADER_LAST_ROW_Y - UPGRADER_FIRST_ROW_Y) / (UPGRADER_VISIBLE_ROWS - 1);
export const UPGRADER_CLICK_X_OFFSET = 60;

// Scrollbar handle (ball center) Y bounds. Linear mapping from top-row 0
// (handle at top) to MAX_TOP_ROW (handle at bottom). Bottom Y was originally
// measured as 462 by eye but tesseract smoke showed clicks landing one row
// past target at higher topRows (e.g. topRow=42 snapped to 43). Lowered to
// 455 to match observed snap zones. Per-skill SCROLL_PITCH is derived from
// the skill's totalRows - fewer rows = larger pitch over the same Y range.
export const UPGRADER_SCROLLBAR_TOP_Y = 90;
export const UPGRADER_SCROLLBAR_BOTTOM_Y = 455;

// Per-skill column position. Only the scrollbar column varies between panels;
// the upgrade button sits at a fixed offset left of the scrollbar (see
// UPGRADER_CLICK_X_OFFSET). Y coords + pitches are shared.
export type UpgraderGeometry = {
  scrollbarX: number;
};

// Settle delays. SCROLL_SETTLE is load-bearing: required to let the scrollbar
// handle finish animating before the next click. Removing it produced a ~5%
// miss rate during tesseract smoke; 250ms still showed a transient miss in
// grimoire smoke (1/27). Bumped to 300ms - missed scrolls in production would
// fire the upgrade click on the wrong row, wasting resources and desyncing
// subsequent step indices.
export const UPGRADER_SCROLL_SETTLE_MS = 50;
export const UPGRADER_CLICK_SETTLE_MS = 50;

// HSV bounds for the panel header check - same shape used elsewhere for
// bright UI text/icons on darker backgrounds.
export const UPGRADER_UI_HSV_LOWER: HsvColor = { h: 0, s: 0, v: 128 };
export const UPGRADER_UI_HSV_UPPER: HsvColor = { h: 192, s: 255, v: 255 };

// Computes scrollbar handle target and on-screen click point for the row at
// `index`. For indices 0..maxTopRow the row sits at the top of the visible
// page (visible_pos = 0). For indices past maxTopRow the scrollbar pins to
// bottom and the row appears further down the page (visible_pos > 0).
export function placementFor(
  index: number,
  totalRows: number,
  geometry: UpgraderGeometry
): {
  scrollbar: Point;
  click: Point;
  topRow: number;
} {
  const maxTopRow = totalRows - UPGRADER_VISIBLE_ROWS;
  const scrollPitch =
    (UPGRADER_SCROLLBAR_BOTTOM_Y - UPGRADER_SCROLLBAR_TOP_Y) / maxTopRow;
  const topRow = Math.min(index, maxTopRow);
  const visiblePos = index - topRow;
  return {
    scrollbar: {
      x: geometry.scrollbarX,
      y: Math.round(UPGRADER_SCROLLBAR_TOP_Y + topRow * scrollPitch),
    },
    click: {
      x: geometry.scrollbarX - UPGRADER_CLICK_X_OFFSET,
      y: Math.round(UPGRADER_FIRST_ROW_Y + visiblePos * UPGRADER_ROW_PITCH),
    },
    topRow,
  };
}
