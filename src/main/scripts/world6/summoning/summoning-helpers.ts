import type { Point } from "../../../backend/backend-types";
import {
  CIRCLE_WAYPOINTS,
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

export const generateEllipsePoints = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  samples: number = CIRCLE_WAYPOINTS
): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = (2 * Math.PI * i) / samples;
    points.push({
      x: Math.round(cx + rx * Math.cos(t)),
      y: Math.round(cy + ry * Math.sin(t)),
    });
  }
  return points;
};
