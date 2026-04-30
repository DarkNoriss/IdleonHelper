import {
  affordabilityGate,
  computePath,
  type GateFn,
  maxedGate,
  type OptimizerStep,
} from "@/parsers/optimizer-core";
import type {
  GrimoireCategory,
  GrimoireData,
  GrimoireOptimizerInput,
  GrimoireStats,
} from "@/types/grimoire";
import { GRIMOIRE_UPGRADE_DEFS } from "./grimoire-data";
import { getUpgradeCost, getWraithStats } from "./grimoire-formulas";

// Verbatim from the game's grimoire category map. "all" is NOT in this map -
// it's handled by the engine's null-gain path (engine.ts:62-64).
export const GRIMOIRE_UPGRADE_CATEGORIES = {
  damage: [0, 6, 8, 13, 16, 18, 20, 21, 28, 31, 33, 35, 43, 46, 50],
  accuracy: [1, 7, 12, 25, 37, 38, 41, 47],
  defence: [2, 7, 15, 27, 30, 38, 40, 49],
  hp: [3, 7, 19, 34, 38, 42],
  crit: [10, 20],
  extraBones: [23, 48],
} as const satisfies Record<string, readonly number[]>;

const STAT_CATEGORIES: Record<
  Exclude<GrimoireCategory, "all">,
  readonly (keyof GrimoireStats)[]
> = {
  damage: ["damage"],
  accuracy: ["accuracy"],
  defence: ["defence"],
  hp: ["hp"],
  crit: ["critChance", "critDamage"],
  extraBones: ["extraBones"],
};

export const BONE_RESOURCE_IDS = [
  "femur",
  "ribcage",
  "cranium",
  "bovinae",
] as const;

type GrimoireState = {
  levels: number[];
  spent: [number, number, number, number];
  reductionsRemaining: number;
};

function boneIdFor(slot: number): string {
  const def = GRIMOIRE_UPGRADE_DEFS[slot];
  if (!def) {
    return BONE_RESOURCE_IDS[0];
  }
  return BONE_RESOURCE_IDS[def.boneType] ?? BONE_RESOURCE_IDS[0];
}

function stateToData(base: GrimoireData, levels: number[]): GrimoireData {
  return {
    ...base,
    upgradeLevels: levels,
    totalUpgradeLevels: levels.reduce((a, b) => a + b, 0),
  };
}

export function computeGrimoirePath(
  input: GrimoireOptimizerInput
): OptimizerStep[] {
  const { data, category, rph, boneFilter, maxSteps, onlyAffordable } = input;

  const allowedSlots: ReadonlySet<number> | null =
    category === "all"
      ? null
      : new Set(
          (GRIMOIRE_UPGRADE_CATEGORIES as Record<string, readonly number[]>)[
            category
          ] ?? []
        );

  const initial: GrimoireState = {
    levels: data.upgradeLevels.slice(),
    spent: [0, 0, 0, 0],
    reductionsRemaining: data.dailyDiscountsRemaining,
  };

  const forceLegendTalent = (s: GrimoireState): boolean =>
    data.hasLegendTalent && s.reductionsRemaining > 0;

  const slotExistsGate: GateFn<GrimoireState> = (slot) => {
    if (slot >= GRIMOIRE_UPGRADE_DEFS.length) {
      return { ok: false, reason: "locked" };
    }
    if (allowedSlots && !allowedSlots.has(slot)) {
      return { ok: false, reason: "locked" };
    }
    if (!data.unlockedIndices.has(slot)) {
      return { ok: false, reason: "locked" };
    }
    if (boneFilter !== "all") {
      const def = GRIMOIRE_UPGRADE_DEFS[slot];
      if (!def || def.boneType !== boneFilter) {
        return { ok: false, reason: "locked" };
      }
    }
    return { ok: true };
  };

  const maxed = maxedGate<GrimoireState>(
    (slot, s) => s.levels[slot] ?? 0,
    (slot) => GRIMOIRE_UPGRADE_DEFS[slot]?.x4 ?? 0
  );

  const affordability = affordabilityGate<GrimoireState>(
    () => onlyAffordable,
    (slot, s) => {
      const def = GRIMOIRE_UPGRADE_DEFS[slot];
      if (!def) {
        return false;
      }
      const cost = getUpgradeCost(
        stateToData(data, s.levels),
        slot,
        forceLegendTalent(s)
      );
      const remaining =
        (data.bones[def.boneType] ?? 0) - (s.spent[def.boneType] ?? 0);
      return Number.isFinite(cost) && cost <= remaining;
    }
  );

  // Score: perHour only (per spec section 5.5). cost / rph[boneType].
  const score = (slot: number, s: GrimoireState): number => {
    const def = GRIMOIRE_UPGRADE_DEFS[slot];
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
    const rate = rph[def.boneType as 0 | 1 | 2 | 3] ?? 0;
    if (rate <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    return cost / rate;
  };

  // gain returns null for "all" -> engine ranks by lowest score (cheapest).
  // For stat categories -> sum of percentChange across the category's stats.
  const gain = (slot: number, s: GrimoireState): number | null => {
    if (category === "all") {
      return null;
    }
    const before = stateToData(data, s.levels);
    const sim = s.levels.slice();
    sim[slot] = (sim[slot] ?? 0) + 1;
    const after = stateToData(data, sim);

    const stats = STAT_CATEGORIES[category];
    const beforeStats = getWraithStats(before);
    const afterStats = getWraithStats(after);
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

  const apply = (slot: number, s: GrimoireState): GrimoireState => {
    const def = GRIMOIRE_UPGRADE_DEFS[slot];
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
    const spent = s.spent.slice() as GrimoireState["spent"];
    spent[def.boneType] = (spent[def.boneType] ?? 0) + cost;
    return {
      levels: next,
      spent,
      reductionsRemaining: Math.max(0, s.reductionsRemaining - 1),
    };
  };

  return computePath<GrimoireState>({
    initialState: initial,
    slotCount: GRIMOIRE_UPGRADE_DEFS.length,
    maxSteps,
    gates: [slotExistsGate, maxed, affordability],
    score,
    gain,
    apply,
    resourceOf: (slot, s) => ({
      id: boneIdFor(slot),
      cost: getUpgradeCost(
        stateToData(data, s.levels),
        slot,
        forceLegendTalent(s)
      ),
    }),
    nameOf: (slot) => GRIMOIRE_UPGRADE_DEFS[slot]?.name ?? "",
    fromLevel: (slot, s) => s.levels[slot] ?? 0,
  });
}
