import type { GrimoireData } from "@/types/grimoire";
import { GRIMOIRE_UPGRADE_DEFS } from "./grimoire-data";

const BONE_BASE_INDEX = 330;
const BONE_COUNT = 4;
const KILL_COUNT_BASE_INDEX = 334;
const KILL_COUNT_LENGTH = 3;
const FIRST_3MC_REDUX_INDEX = 499;
const DAILY_DISCOUNTS_USED_INDEX = 480;

// Legend Talent 23 ("Daily Shopping Spree") - same as compass + tesseract.
const LEGEND_TALENT_DAILY_SPREE_INDEX = 23;
const LEGEND_TALENT_DAILY_SPREE_PER_LEVEL = 8;

export function parseGrimoire(parsedJson: unknown): GrimoireData | null {
  if (!parsedJson || typeof parsedJson !== "object") {
    return null;
  }

  const candidate = parsedJson as Record<string, unknown>;
  const dataCandidate = candidate.data;
  const root: Record<string, unknown> =
    dataCandidate &&
    typeof dataCandidate === "object" &&
    !Array.isArray(dataCandidate)
      ? (dataCandidate as Record<string, unknown>)
      : candidate;

  const grimoireRaw = parseArrayValue(root.Grimoire);
  if (!Array.isArray(grimoireRaw)) {
    return null;
  }
  // Game over-allocates the Grimoire array (~100 slots); only the first
  // GRIMOIRE_UPGRADE_DEFS.length (55) slots are meaningful, the rest are 0.
  // We sum the full array for parity with the game's totalLevels.
  const upgradeLevels = grimoireRaw.map((v) => Number(v ?? 0) || 0);
  const totalUpgradeLevels = upgradeLevels.reduce((a, b) => a + b, 0);

  const unlockedIndices = computeUnlockedIndices(totalUpgradeLevels);

  // OptLacc -> the game's accountOptions. Bones at 330..333, kill counts at 334..336.
  const accountOptions = parseArrayValue(root.OptLacc);
  const bones = Array.from({ length: BONE_COUNT }, (_, i) =>
    Array.isArray(accountOptions)
      ? Number(accountOptions[BONE_BASE_INDEX + i] ?? 0) || 0
      : 0
  ) as [number, number, number, number];
  const killCounts = Array.from({ length: KILL_COUNT_LENGTH }, (_, i) =>
    Array.isArray(accountOptions)
      ? Number(accountOptions[KILL_COUNT_BASE_INDEX + i] ?? 0) || 0
      : 0
  ) as [number, number, number];

  // BundlesReceived.bon_p - masterclass bundle. Same shape compass + tesseract use.
  const bundlesRaw = parsePassthrough(root.BundlesReceived);
  const hasBonusBundle = Boolean(
    bundlesRaw &&
      typeof bundlesRaw === "object" &&
      !Array.isArray(bundlesRaw) &&
      (bundlesRaw as Record<string, unknown>).bon_p
  );

  // Spelunk[18][23] = legend talent 23 level. Bonus = 8 * level.
  const spelunkRaw = parseArrayValue(root.Spelunk);
  const legendTalentsRaw = Array.isArray(spelunkRaw) ? spelunkRaw[18] : null;
  const legendTalentLevel = Array.isArray(legendTalentsRaw)
    ? Number(legendTalentsRaw[LEGEND_TALENT_DAILY_SPREE_INDEX] ?? 0) || 0
    : 0;
  const dailyDiscountsMax =
    LEGEND_TALENT_DAILY_SPREE_PER_LEVEL * legendTalentLevel;
  const hasLegendTalent = dailyDiscountsMax > 0;

  // OptLacc[480] = uses today.
  const usesToday = Array.isArray(accountOptions)
    ? Number(accountOptions[DAILY_DISCOUNTS_USED_INDEX] ?? 0) || 0
    : 0;
  const dailyDiscountsRemaining = Math.max(0, dailyDiscountsMax - usesToday);

  // OptLacc[499] = first3mcCostRedux option (always applies).
  const first3mcOption = Array.isArray(accountOptions)
    ? Number(accountOptions[FIRST_3MC_REDUX_INDEX] ?? 0) || 0
    : 0;
  const first3mcMultiplier = 1 / (1 + first3mcOption / 100);

  return {
    upgradeLevels,
    totalUpgradeLevels,
    bones,
    killCounts,
    unlockedIndices,
    dailyDiscountsRemaining,
    dailyDiscountsMax,
    hasLegendTalent,
    hasBonusBundle,
    first3mcMultiplier,
    raw: parsedJson,
  };
}

// Mirrors the game's grimoire unlock check: `upgrade.unlockLevel <= totalUpgradeLevels`.
function computeUnlockedIndices(
  totalUpgradeLevels: number
): ReadonlySet<number> {
  const unlocked = new Set<number>();
  for (let i = 0; i < GRIMOIRE_UPGRADE_DEFS.length; i++) {
    const def = GRIMOIRE_UPGRADE_DEFS[i];
    if (def && def.unlockLevel <= totalUpgradeLevels) {
      unlocked.add(i);
    }
  }
  return unlocked;
}

function parseArrayValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

function parsePassthrough(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}
