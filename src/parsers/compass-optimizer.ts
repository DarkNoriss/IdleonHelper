import {
  affordabilityGate,
  computePath,
  type GateFn,
  maxedGate,
  type OptimizerStep,
} from "@/parsers/optimizer-core";
import type {
  CompassCategory,
  CompassData,
  CompassOptimizerInput,
  CompassStats,
} from "@/types/compass";
import { COMPASS_UPGRADE_DEFS } from "./compass-data";
import {
  getCompassStats,
  getExtraDustMultiplier,
  getUpgradeCost,
} from "./compass-formulas";

// Toolbox UPGRADE_CATEGORIES — verbatim port. Each category lists the upgrade
// indices the optimizer should consider when scoring that category.
export const COMPASS_UPGRADE_CATEGORIES = {
  damage: [
    6, 8, 10, 23, 113, 112, 14, 119, 15, 122, 123, 121, 129, 130, 127, 24, 132,
    135, 126, 48, 155, 157, 158, 60, 64, 74, 75, 81, 85, 94, 78,
  ],
  dust: [139, 142, 34, 145, 31, 38, 33, 148, 150, 68, 86, 89, 93],
  accuracy: [
    6, 17, 22, 120, 124, 19, 22, 125, 134, 128, 133, 25, 131, 136, 147, 61, 79,
    84, 90,
  ],
  defence: [29, 137, 30, 141, 138, 144, 149, 143, 63, 83, 91],
  crit: [16, 123, 20, 42, 66, 75],
  attackSpeed: [21, 69],
  hp: [28, 84, 87, 92],
} as const satisfies Record<string, readonly number[]>;

// Per-category list of CompassStats keys to sum percentChange over.
// Matches toolbox UPGRADE_CATEGORIES[category].stats.
const CATEGORY_STATS: Record<
  Exclude<CompassCategory, "all" | "dust">,
  readonly (keyof CompassStats)[]
> = {
  damage: ["damage"],
  accuracy: ["accuracy"],
  defence: ["defence"],
  crit: ["critPct", "critDamage"],
  attackSpeed: ["attackSpeed"],
  hp: ["hp"],
};

export const DUST_RESOURCE_IDS = [
  "stardust",
  "moondust",
  "solardust",
  "cooldust",
  "novadust",
] as const;

type CompassState = {
  levels: number[];
  spent: [number, number, number, number, number];
  // Daily cheap-upgrades remaining; decremented per applied step. Drives the
  // `forceLegendTalent` flag passed into the cost formula. Goes from
  // `data.dailyDiscountsRemaining` down to 0, then upgrades use the no-legend
  // multiplier (matches toolbox genericUpgradeOptimizer.ts:65 / 103 / 186).
  reductionsRemaining: number;
};

function dustIdFor(slot: number): string {
  const def = COMPASS_UPGRADE_DEFS[slot];
  if (!def) {
    return DUST_RESOURCE_IDS[0];
  }
  return DUST_RESOURCE_IDS[def.x3] ?? DUST_RESOURCE_IDS[0];
}

function stateToData(base: CompassData, levels: number[]): CompassData {
  return { ...base, upgradeLevels: levels };
}

export function computeCompassPath(
  input: CompassOptimizerInput
): OptimizerStep[] {
  const {
    data,
    category,
    scoreMode,
    rph,
    dustFilter,
    maxSteps,
    onlyAffordable,
  } = input;

  const allowedSlots: ReadonlySet<number> | null =
    category === "all"
      ? null
      : new Set(COMPASS_UPGRADE_CATEGORIES[category] ?? []);

  const initial: CompassState = {
    levels: data.upgradeLevels.slice(),
    spent: [0, 0, 0, 0, 0],
    reductionsRemaining: data.dailyDiscountsRemaining,
  };

  const forceLegendTalent = (s: CompassState): boolean =>
    data.hasLegendTalent && s.reductionsRemaining > 0;

  const slotExistsGate: GateFn<CompassState> = (slot) => {
    if (slot >= COMPASS_UPGRADE_DEFS.length) {
      return { ok: false, reason: "locked" };
    }
    if (allowedSlots && !allowedSlots.has(slot)) {
      return { ok: false, reason: "locked" };
    }
    if (!data.unlockedIndices.has(slot)) {
      return { ok: false, reason: "locked" };
    }
    if (dustFilter !== "all") {
      const def = COMPASS_UPGRADE_DEFS[slot];
      if (!def || def.x3 !== dustFilter) {
        return { ok: false, reason: "locked" };
      }
    }
    return { ok: true };
  };

  const maxed = maxedGate<CompassState>(
    (slot, s) => s.levels[slot] ?? 0,
    (slot) => COMPASS_UPGRADE_DEFS[slot]?.x4 ?? 0
  );

  const affordability = affordabilityGate<CompassState>(
    () => onlyAffordable,
    (slot, s) => {
      const def = COMPASS_UPGRADE_DEFS[slot];
      if (!def) {
        return false;
      }
      const cost = getUpgradeCost(
        stateToData(data, s.levels),
        slot,
        forceLegendTalent(s)
      );
      const remaining = (data.dusts[def.x3] ?? 0) - (s.spent[def.x3] ?? 0);
      return Number.isFinite(cost) && cost <= remaining;
    }
  );

  const score = (slot: number, s: CompassState): number => {
    const def = COMPASS_UPGRADE_DEFS[slot];
    if (!def) {
      return 0;
    }
    const cost = getUpgradeCost(
      stateToData(data, s.levels),
      slot,
      forceLegendTalent(s)
    );
    if (!Number.isFinite(cost) || cost <= 0) {
      return 0;
    }
    if (scoreMode === "perHour") {
      const rate = rph[def.x3 as 0 | 1 | 2 | 3 | 4] ?? 0;
      if (rate <= 0) {
        return Number.POSITIVE_INFINITY;
      }
      return cost / rate;
    }
    return cost;
  };

  // Match toolbox: gain = sum of percentChange across the category's stats.
  // percentChange[s] = (after[s] - before[s]) / before[s] * 100, or 0 when
  // before[s] <= 0. The optimizer-core engine then computes
  // efficiency = gain / score, which equals toolbox's
  // efficiency = totalStatChange / cost (or / timeCost for perHour).
  const gain = (slot: number, s: CompassState): number | null => {
    if (category === "all") {
      return null;
    }
    const before = stateToData(data, s.levels);
    const sim = s.levels.slice();
    sim[slot] = (sim[slot] ?? 0) + 1;
    const after = stateToData(data, sim);

    if (category === "dust") {
      const baseline = getExtraDustMultiplier(before);
      const next = getExtraDustMultiplier(after);
      if (baseline <= 0) {
        return 0;
      }
      const pct = ((next - baseline) / baseline) * 100;
      return Number.isFinite(pct) && pct > 0 ? pct : 0;
    }

    const stats = CATEGORY_STATS[category];
    const beforeStats = getCompassStats(before);
    const afterStats = getCompassStats(after);
    let total = 0;
    for (const stat of stats) {
      const cur = beforeStats[stat];
      const next = afterStats[stat];
      if (cur > 0) {
        total += ((next - cur) / cur) * 100;
      }
    }
    return Number.isFinite(total) && total > 0 ? total : 0;
  };

  const apply = (slot: number, s: CompassState): CompassState => {
    const def = COMPASS_UPGRADE_DEFS[slot];
    if (!def) {
      return s;
    }
    const cost = getUpgradeCost(
      stateToData(data, s.levels),
      slot,
      forceLegendTalent(s)
    );
    const next = s.levels.slice();
    next[slot] = (next[slot] ?? 0) + 1;
    const spent = s.spent.slice() as [number, number, number, number, number];
    spent[def.x3] = (spent[def.x3] ?? 0) + cost;
    return {
      levels: next,
      spent,
      reductionsRemaining: Math.max(0, s.reductionsRemaining - 1),
    };
  };

  return computePath<CompassState>({
    initialState: initial,
    slotCount: COMPASS_UPGRADE_DEFS.length,
    maxSteps,
    gates: [slotExistsGate, maxed, affordability],
    score,
    gain,
    apply,
    resourceOf: (slot, s) => ({
      id: dustIdFor(slot),
      cost: getUpgradeCost(
        stateToData(data, s.levels),
        slot,
        forceLegendTalent(s)
      ),
    }),
    nameOf: (slot) => COMPASS_UPGRADE_DEFS[slot]?.name ?? "",
    fromLevel: (slot, s) => s.levels[slot] ?? 0,
  });
}
