import type { CompassData } from "@/types/compass";
import { COMPASS_RANDOM_LIST } from "./compass-data";

const DUST_COST_FLOOR = 6.2;
const DUST_SLOT_COUNT = 5;
const DUST_BASE_INDEX = 357;
const TOTAL_DUSTS_INDEX = 362;
const FIRST_3MC_REDUX_INDEX = 499;
const DAILY_DISCOUNTS_USED_INDEX = 480;

// Legend talent 23 "Daily Shopping Spree" — first N masterclass upgrades each
// day are cheaper. Toolbox legendTalents[23]: x1=3 (max level), x2=8 (per
// level). At max level: bonus = 24 daily discounts.
const LEGEND_TALENT_DAILY_SPREE_INDEX = 23;
const LEGEND_TALENT_DAILY_SPREE_PER_LEVEL = 8;

export function parseCompass(parsedJson: unknown): CompassData | null {
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

  const compassRaw = parseArrayValue(root.Compass);
  if (!Array.isArray(compassRaw)) {
    return null;
  }

  const upgradesLevelsRaw = compassRaw[0];
  if (!Array.isArray(upgradesLevelsRaw)) {
    return null;
  }
  const upgradeLevels = upgradesLevelsRaw.map((v) => Number(v ?? 0) || 0);

  // Compass[1] = abominations unlock array. abominationsRaw[i] truthy means
  // that abomination is unlocked. Length grows with game patches.
  const abominationsRaw = Array.isArray(compassRaw[1])
    ? (compassRaw[1] as unknown[]).map((v) => Number(v ?? 0) || 0)
    : [];

  const unlockedIndices = computeUnlockedIndices(
    upgradeLevels,
    abominationsRaw
  );

  // Account-level options ("OptLacc" in raw save). Toolbox renames it to
  // "accountOptions" during its parse pipeline. Missing-or-invalid is OK —
  // dusts default to 0 so the upgrade list still renders.
  const accountOptions = parseArrayValue(root.OptLacc);
  const dusts = Array.from({ length: DUST_SLOT_COUNT }, (_, i) =>
    Array.isArray(accountOptions)
      ? Number(accountOptions[DUST_BASE_INDEX + i] ?? 0) || 0
      : 0
  ) as [number, number, number, number, number];
  const totalDustsCollected = Array.isArray(accountOptions)
    ? Number(accountOptions[TOTAL_DUSTS_INDEX] ?? 0) || 0
    : 0;

  // Bundle "bon_p" gives the masterclass cost reduction.
  const bundlesRaw = parsePassthrough(root.BundlesReceived);
  const hasBonusBundle = Boolean(
    bundlesRaw &&
      typeof bundlesRaw === "object" &&
      !Array.isArray(bundlesRaw) &&
      (bundlesRaw as Record<string, unknown>).bon_p
  );

  // Legend talent 23 level lives at Spelunk[18][23]. Bonus = 8 * level.
  const spelunkRaw = parseArrayValue(root.Spelunk);
  const legendTalentsRaw = Array.isArray(spelunkRaw) ? spelunkRaw[18] : null;
  const legendTalentLevel = Array.isArray(legendTalentsRaw)
    ? Number(legendTalentsRaw[LEGEND_TALENT_DAILY_SPREE_INDEX] ?? 0) || 0
    : 0;
  const dailyDiscountsMax =
    LEGEND_TALENT_DAILY_SPREE_PER_LEVEL * legendTalentLevel;
  const hasLegendTalent = dailyDiscountsMax > 0;

  // OptLacc[480] = uses today; talent is active while uses < max.
  const usesToday = Array.isArray(accountOptions)
    ? Number(accountOptions[DAILY_DISCOUNTS_USED_INDEX] ?? 0) || 0
    : 0;
  const dailyDiscountsRemaining = Math.max(0, dailyDiscountsMax - usesToday);

  // first3mcCostRedux always applies (independent of legend talent).
  const first3mcOption = Array.isArray(accountOptions)
    ? Number(accountOptions[FIRST_3MC_REDUX_INDEX] ?? 0) || 0
    : 0;
  const first3mcMultiplier = 1 / (1 + first3mcOption / 100);

  return {
    upgradeLevels,
    dusts,
    totalDustsCollected,
    unlockedIndices,
    dailyDiscountsRemaining,
    dailyDiscountsMax,
    dailyDiscountsResetAt: null,
    hasLegendTalent,
    hasBonusBundle,
    first3mcMultiplier,
    serverDustCost: DUST_COST_FLOOR,
    raw: parsedJson,
  };
}

// Toolbox compass.ts:313-372 (`getGroupedUpgrades`) — verbatim port of the
// unlock logic. Each path's first upgrade carries its level as the "unlock
// counter": item at position i is unlocked when i <= count. Abomination
// path is unlocked per `Compass[1]` directly. Default group covers
// upgrades 0 (Pathfinder) and 170 (Worldfinder).
//
// Upgrades not in any path are left LOCKED — toolbox's optimizer iterates
// only over `groupedUpgrades`, never over the raw def list.
const PATH_PREPENDS: ReadonlyArray<{
  randomListIdx: number;
  prepend: number | null;
}> = [
  { randomListIdx: 0, prepend: 1 }, // Elemental
  { randomListIdx: 1, prepend: 13 }, // Fighter
  { randomListIdx: 2, prepend: 27 }, // Survival
  { randomListIdx: 3, prepend: 40 }, // Nomadic
  { randomListIdx: 4, prepend: null }, // Abomination
];

const ABOMINATION_PATH_INDEX = 4;
const DEFAULT_GROUP_INDICES = [0, 170] as const;

function computeUnlockedIndices(
  upgradeLevels: number[],
  abominationsRaw: number[]
): ReadonlySet<number> {
  const unlocked = new Set<number>();

  // Default group: position 0 always unlocked, position 1 (upgrade 170)
  // unlocks when upgrade 0 reaches level 1+.
  const defaultUnlockedCount = upgradeLevels[DEFAULT_GROUP_INDICES[0]] ?? 0;
  DEFAULT_GROUP_INDICES.forEach((upgIdx, i) => {
    if (i <= defaultUnlockedCount) {
      unlocked.add(upgIdx);
    }
  });

  for (const { randomListIdx, prepend } of PATH_PREPENDS) {
    const raw = COMPASS_RANDOM_LIST[randomListIdx] ?? [];
    const ordering = raw.map((v) => Number(v)).filter((v) => !Number.isNaN(v));
    if (ordering.length === 0) {
      continue;
    }

    const list = prepend === null ? ordering : [prepend, ...ordering];

    if (randomListIdx === ABOMINATION_PATH_INDEX) {
      list.forEach((upgIdx, i) => {
        if (abominationsRaw[i]) {
          unlocked.add(upgIdx);
        }
      });
    } else {
      const firstUpgIdx = list[0] as number;
      const unlockedCount = upgradeLevels[firstUpgIdx] ?? 0;
      list.forEach((upgIdx, i) => {
        if (i <= unlockedCount) {
          unlocked.add(upgIdx);
        }
      });
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
