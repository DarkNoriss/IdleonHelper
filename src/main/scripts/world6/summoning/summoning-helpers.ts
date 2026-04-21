import type { Point } from "../../../backend/backend-types";
import {
  MIN_BOARD_MATCHES,
  MIN_RADIUS_PX,
  OUTLIER_MAD_MULTIPLIER,
  OUTLIER_MIN_SPREAD_PX,
} from "./summoning-constants";

export type BoardGeometry = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

// Diagnostic-only outlier filter. Retained so summoning-debug can still show
// raw vs filtered match counts. Geometry computation uses raw min/max instead,
// since legitimate top-row tiles can appear sparse and get wrongly rejected.
export const filterBoardOutliers = (matches: Point[]): Point[] => {
  if (matches.length < MIN_BOARD_MATCHES) {
    return matches;
  }
  const sortedYs = matches.map((m) => m.y).sort((a, b) => a - b);
  const medianY = sortedYs[Math.floor(sortedYs.length / 2)]!;
  const sortedDeviations = sortedYs
    .map((y) => Math.abs(y - medianY))
    .sort((a, b) => a - b);
  const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)]!;
  const threshold = Math.max(
    mad * OUTLIER_MAD_MULTIPLIER,
    OUTLIER_MIN_SPREAD_PX
  );
  return matches.filter((m) => Math.abs(m.y - medianY) <= threshold);
};

// Compute the board's full bounding rectangle and derived ellipse params from
// raw match points. Uses all matches - no outlier filtering - so sparse
// top-row tiles contribute to the extent just as densely-packed bottom-row
// tiles do.
export const computeBoardGeometry = (
  matches: Point[]
): BoardGeometry | null => {
  if (matches.length < MIN_BOARD_MATCHES) {
    return null;
  }
  let xMin = matches[0]!.x;
  let xMax = matches[0]!.x;
  let yMin = matches[0]!.y;
  let yMax = matches[0]!.y;
  for (const m of matches) {
    if (m.x < xMin) {
      xMin = m.x;
    }
    if (m.x > xMax) {
      xMax = m.x;
    }
    if (m.y < yMin) {
      yMin = m.y;
    }
    if (m.y > yMax) {
      yMax = m.y;
    }
  }
  const cx = (xMin + xMax) / 2;
  const cy = (yMin + yMax) / 2;
  const rx = (xMax - xMin) / 2;
  const ry = (yMax - yMin) / 2;
  if (rx < MIN_RADIUS_PX || ry < MIN_RADIUS_PX) {
    return null;
  }
  return { xMin, xMax, yMin, yMax, cx, cy, rx, ry };
};

// Jittered stratified sampling over [yMin, yMax].
// - Each of N bands gets exactly one sample - no clumping, full coverage.
// - Inset of minSpacing/2 each side guarantees >= minSpacing between any pair.
// - Band count is reduced if the range is too small to fit count samples.
// - Shuffled before returning so click order is not monotonic top-to-bottom.
export const jitteredYs = (
  yMin: number,
  yMax: number,
  count: number,
  minSpacing: number
): number[] => {
  const range = yMax - yMin;
  const maxByRange = Math.floor(range / minSpacing);
  const n = Math.max(1, Math.min(count, maxByRange));
  const bandSize = range / n;
  const inset = minSpacing / 2;
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    const start = yMin + i * bandSize;
    const jitter = inset + Math.random() * (bandSize - 2 * inset);
    ys.push(Math.round(start + jitter));
  }
  for (let i = ys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ys[i], ys[j]] = [ys[j]!, ys[i]!];
  }
  return ys;
};
