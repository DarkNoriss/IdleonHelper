import type { CompanionRawData, IdleonRawData } from "@/types/raw-json";
import { COMPANIONS, isCompanionAcquired } from "./companions";

// Per-shape observation bonus percentages (`research[5]` in toolbox). When a
// shape is on cell N, `Research[1][N]` holds the shape index (-1 = no shape)
// and the grid bonus is multiplied by `(1 + OBSERVATION_BONUS_PCT[shapeIdx]/100)`.
const OBSERVATION_BONUS_PCT = [25, 15, 50, 20, 20, 35, 25, 30, 35, 60] as const;

/**
 * Grid-bonus all-multi factor. Multiplies every research-grid bonus.
 * Mirrors toolbox `parsers/world-7/research.ts:getGridBonusAllmulti`.
 *
 * Game formula:
 *   `1 + (15*c55 + 5*min(1, gridLv173 * c0) + cloud71 + cloud72 + cloud76
 *        + extraAdditive) / 100`
 *
 * - `cloud<N>` is 1 iff equinox challenge `WeeklyBoss.d_<N>` is fully
 *   completed (value === -1).
 * - `extraAdditive` lets feature-specific terms add to the multi -- e.g. sushi
 *   passes 1 when `uniqueSushi > 53` (the `research[37][53]` rog bonus).
 */
export function computeGridAllMulti(
  root: IdleonRawData,
  companion: CompanionRawData | null,
  extraAdditive = 0
): number {
  const research = parseResearch(root);
  const gridLevels = research?.[0];
  const grid173Lv = Array.isArray(gridLevels)
    ? Number(gridLevels[173] ?? 0) || 0
    : 0;
  const c0 = isCompanionAcquired(companion, 0) ? 1 : 0;
  const c55 = isCompanionAcquired(companion, 55) ? COMPANIONS[55].bonus : 0;
  const wb = parseWeeklyBoss(root);
  const cloudActive = (idx: number): number =>
    wb?.[`d_${idx}`] === -1 ? 1 : 0;
  return (
    1 +
    (c55 +
      5 * Math.min(1, grid173Lv * c0) +
      cloudActive(71) +
      cloudActive(72) +
      cloudActive(76) +
      extraAdditive) /
      100
  );
}

/**
 * Reads a research-grid cell and returns
 * `baseBonus * level * (1 + observationPct/100) * max(1, allMulti)`.
 *
 * Mirrors toolbox `getResearchGridBonusInternal(account, research, gridIdx, 0)`
 * for cells without custom mode-2 logic. Returns 0 when the cell is unleveled.
 */
export function readGridBonus(
  root: IdleonRawData,
  gridIdx: number,
  baseBonus: number,
  allMulti: number
): number {
  const research = parseResearch(root);
  const gridLevels = research?.[0];
  if (!Array.isArray(gridLevels)) {
    return 0;
  }
  const level = Number(gridLevels[gridIdx] ?? 0) || 0;
  if (level <= 0) {
    return 0;
  }
  const obsList = research?.[1];
  const obsIdx = Array.isArray(obsList) ? Number(obsList[gridIdx] ?? -1) : -1;
  const obsPct =
    obsIdx >= 0 ? Number(OBSERVATION_BONUS_PCT[obsIdx] ?? 0) || 0 : 0;
  return baseBonus * level * (1 + obsPct / 100) * Math.max(1, allMulti);
}

function parseResearch(root: IdleonRawData): unknown[] | null {
  const raw = root.Research;
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function parseWeeklyBoss(root: IdleonRawData): Record<string, unknown> | null {
  const raw = root.WeeklyBoss;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}
