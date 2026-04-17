import type { Point } from "../../../backend/backend-types";
import { CIRCLE_WAYPOINTS, MIN_BOARD_MATCHES } from "./summoning-constants";

export type BoardGeometry = {
  yMin: number;
  yMax: number;
  cy: number;
  radius: number;
};

export const computeBoardYRange = (matches: Point[]): BoardGeometry | null => {
  if (matches.length < MIN_BOARD_MATCHES) {
    return null;
  }
  let yMin = matches[0]!.y;
  let yMax = matches[0]!.y;
  for (const m of matches) {
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
