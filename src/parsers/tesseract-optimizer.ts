import {
  affordabilityGate,
  computePath,
  type GateFn,
  maxedGate,
  type OptimizerStep,
} from "@/parsers/optimizer-core";
import type {
  TesseractCategory,
  TesseractData,
  TesseractOptimizerInput,
  TesseractStats,
} from "@/types/tesseract";
import { TESSERACT_UPGRADE_DEFS } from "./tesseract-data";
import {
  getArcanistStats,
  getExtraTachyonGain,
  getUpgradeCost,
} from "./tesseract-formulas";

// Verbatim from toolbox tesseract.ts:26-57. "all" is NOT in this map - it's
// handled by the engine's null-gain path (engine.ts:62-64).
export const TESSERACT_UPGRADE_CATEGORIES = {
  damage: [0, 4, 6, 12, 15, 24, 31, 36, 42, 50, 53, 39, 49, 54],
  accuracy: [1, 9, 19, 22, 27, 38, 44, 52, 55, 39, 49, 54],
  defence: [2, 11, 22, 29, 44, 46, 55, 39, 49, 54],
  crit: [8, 14, 39, 49, 54],
  attackSpeed: [21, 39, 49, 54],
  tachyons: [17, 34, 56],
} as const satisfies Record<string, readonly number[]>;

const STAT_CATEGORIES: Record<
  Exclude<TesseractCategory, "all" | "tachyons">,
  readonly (keyof TesseractStats)[]
> = {
  damage: ["damage"],
  accuracy: ["accuracy"],
  defence: ["defence"],
  crit: ["critPct", "critDamage"],
  attackSpeed: ["attackSpeed"],
};

export const TACHYON_RESOURCE_IDS = [
  "purple",
  "brown",
  "green",
  "red",
  "silver",
  "gold",
] as const;

type TesseractState = {
  levels: number[];
  spent: [number, number, number, number, number, number];
  reductionsRemaining: number;
};

function tachyonIdFor(slot: number): string {
  const def = TESSERACT_UPGRADE_DEFS[slot];
  if (!def) {
    return TACHYON_RESOURCE_IDS[0];
  }
  return TACHYON_RESOURCE_IDS[def.x3] ?? TACHYON_RESOURCE_IDS[0];
}

function stateToData(base: TesseractData, levels: number[]): TesseractData {
  return {
    ...base,
    upgradeLevels: levels,
    totalUpgradeLevels: levels.reduce((a, b) => a + b, 0),
  };
}

export function computeTesseractPath(
  input: TesseractOptimizerInput
): OptimizerStep[] {
  const {
    data,
    category,
    scoreMode,
    rph,
    tachyonFilter,
    maxSteps,
    onlyAffordable,
  } = input;

  const allowedSlots: ReadonlySet<number> | null =
    category === "all"
      ? null
      : new Set(
          (TESSERACT_UPGRADE_CATEGORIES as Record<string, readonly number[]>)[
            category
          ] ?? []
        );

  const initial: TesseractState = {
    levels: data.upgradeLevels.slice(),
    spent: [0, 0, 0, 0, 0, 0],
    reductionsRemaining: data.dailyDiscountsRemaining,
  };

  const forceLegendTalent = (s: TesseractState): boolean =>
    data.hasLegendTalent && s.reductionsRemaining > 0;

  const slotExistsGate: GateFn<TesseractState> = (slot) => {
    if (slot >= TESSERACT_UPGRADE_DEFS.length) {
      return { ok: false, reason: "locked" };
    }
    if (allowedSlots && !allowedSlots.has(slot)) {
      return { ok: false, reason: "locked" };
    }
    if (!data.unlockedIndices.has(slot)) {
      return { ok: false, reason: "locked" };
    }
    if (tachyonFilter !== "all") {
      const def = TESSERACT_UPGRADE_DEFS[slot];
      if (!def || def.x3 !== tachyonFilter) {
        return { ok: false, reason: "locked" };
      }
    }
    return { ok: true };
  };

  const maxed = maxedGate<TesseractState>(
    (slot, s) => s.levels[slot] ?? 0,
    (slot) => TESSERACT_UPGRADE_DEFS[slot]?.x4 ?? 0
  );

  const affordability = affordabilityGate<TesseractState>(
    () => onlyAffordable,
    (slot, s) => {
      const def = TESSERACT_UPGRADE_DEFS[slot];
      if (!def) {
        return false;
      }
      const cost = getUpgradeCost(
        stateToData(data, s.levels),
        slot,
        forceLegendTalent(s)
      );
      const remaining = (data.tachyons[def.x3] ?? 0) - (s.spent[def.x3] ?? 0);
      return Number.isFinite(cost) && cost <= remaining;
    }
  );

  const score = (slot: number, s: TesseractState): number => {
    const def = TESSERACT_UPGRADE_DEFS[slot];
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
      const rate = rph[def.x3 as 0 | 1 | 2 | 3 | 4 | 5] ?? 0;
      if (rate <= 0) {
        return Number.POSITIVE_INFINITY;
      }
      return cost / rate;
    }
    return cost;
  };

  // gain returns null for "all" -> engine ranks by lowest score (cheapest).
  // For "tachyons" -> percentChange of getExtraTachyonGain (single scalar).
  // For stat categories -> sum of percentChange across the category's stats.
  const gain = (slot: number, s: TesseractState): number | null => {
    if (category === "all") {
      return null;
    }
    const before = stateToData(data, s.levels);
    const sim = s.levels.slice();
    sim[slot] = (sim[slot] ?? 0) + 1;
    const after = stateToData(data, sim);

    if (category === "tachyons") {
      const baseline = getExtraTachyonGain(before);
      const next = getExtraTachyonGain(after);
      if (baseline <= 0) {
        return 0;
      }
      const pct = ((next - baseline) / baseline) * 100;
      return Number.isFinite(pct) && pct > 0 ? pct : 0;
    }

    const stats = STAT_CATEGORIES[category];
    const beforeStats = getArcanistStats(before);
    const afterStats = getArcanistStats(after);
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

  const apply = (slot: number, s: TesseractState): TesseractState => {
    const def = TESSERACT_UPGRADE_DEFS[slot];
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
    const spent = s.spent.slice() as TesseractState["spent"];
    spent[def.x3] = (spent[def.x3] ?? 0) + cost;
    return {
      levels: next,
      spent,
      reductionsRemaining: Math.max(0, s.reductionsRemaining - 1),
    };
  };

  return computePath<TesseractState>({
    initialState: initial,
    slotCount: TESSERACT_UPGRADE_DEFS.length,
    maxSteps,
    gates: [slotExistsGate, maxed, affordability],
    score,
    gain,
    apply,
    resourceOf: (slot, s) => ({
      id: tachyonIdFor(slot),
      cost: getUpgradeCost(
        stateToData(data, s.levels),
        slot,
        forceLegendTalent(s)
      ),
    }),
    nameOf: (slot) => TESSERACT_UPGRADE_DEFS[slot]?.name ?? "",
    fromLevel: (slot, s) => s.levels[slot] ?? 0,
  });
}
