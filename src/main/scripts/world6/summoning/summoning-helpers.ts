import type { Point } from "../../../backend/backend-types";
import {
  CIRCLE_WAYPOINTS,
  MIN_BOARD_MATCHES,
  OUTLIER_MAD_MULTIPLIER,
  OUTLIER_MIN_SPREAD_PX,
} from "./summoning-constants";

export type BoardGeometry = {
  yMin: number;
  yMax: number;
  cy: number;
  radius: number;
};

// Drop matches whose y coordinate is far from the dense cluster. Keeps the
// board range tight when stray UI elements (chat bubbles, icons) happen to
// pass the HSV + template match.
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

export const computeBoardYRange = (matches: Point[]): BoardGeometry | null => {
  const filtered = filterBoardOutliers(matches);
  if (filtered.length < MIN_BOARD_MATCHES) {
    return null;
  }
  let yMin = filtered[0]!.y;
  let yMax = filtered[0]!.y;
  for (const m of filtered) {
    if (m.y < yMin) {
      yMin = m.y;
    }
    if (m.y > yMax) {
      yMax = m.y;
    }
  }
  const cy = (yMin + yMax) / 2;
  const radius = (yMax - yMin) / 2;
  return { yMin, yMax, cy, radius };
};

export const generateCirclePoints = (
  cx: number,
  cy: number,
  radius: number,
  samples: number = CIRCLE_WAYPOINTS
): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = (2 * Math.PI * i) / samples;
    points.push({
      x: Math.round(cx + radius * Math.cos(t)),
      y: Math.round(cy + radius * Math.sin(t)),
    });
  }
  return points;
};
