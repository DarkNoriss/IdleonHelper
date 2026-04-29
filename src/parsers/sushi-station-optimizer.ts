import {
  affordabilityGate,
  computePath,
  type GateFn,
  maxedGate,
  type OptimizerStep,
} from "@/parsers/optimizer-core";
import type {
  ComputePathInput,
  OptimizerCategory,
  SushiStationData,
} from "@/types/sushi-station";
import {
  computeOrangeFireSum,
  computeUniqueSushi,
  type ExternalSources,
  fireplaceEffectBase,
  fuelCapacity,
  fuelGenPerHr,
  knowledgeBonusTotals,
  SLOT_TO_UPG,
  SUSHI_UPG,
  slotUpgIdx,
  totalBucksPerHr,
  upgCost,
  upgLvReq,
} from "./sushi-station-formulas";

const MAX_LEVEL_INFINITE = 9999;
const RESOURCE_ID = "bucks";

type SushiState = {
  levels: number[];
  spent: number;
};

type Metric = (levels: number[]) => number;

function buildMetric(
  category: OptimizerCategory,
  data: SushiStationData,
  knowledgeTotals: number[],
  externalSources: ExternalSources
): Metric | null {
  if (category === "all") {
    return null;
  }
  const uniqueSushi = computeUniqueSushi(data.rawSushiData);
  const fireplaceBase = fireplaceEffectBase(knowledgeTotals, data.sparks);
  const orangeFire = computeOrangeFireSum(data.rawSushiData, fireplaceBase);

  if (category === "bucks") {
    return (levels) =>
      totalBucksPerHr(
        data.rawSushiData,
        levels,
        uniqueSushi,
        knowledgeTotals,
        externalSources
      );
  }
  if (category === "fuelRate") {
    return (levels) =>
      fuelGenPerHr(
        levels,
        data.rawSushiData,
        knowledgeTotals,
        orangeFire,
        data.hasBundleV
      );
  }
  return (levels) => fuelCapacity(levels, knowledgeTotals, data.hasBundleV);
}

export function computeSushiPath(input: ComputePathInput): OptimizerStep[] {
  const { data, category, maxSteps, onlyAffordable } = input;

  const knowledgeTotals = knowledgeBonusTotals(data.rawSushiData);
  const uniqueSushi = computeUniqueSushi(data.rawSushiData);
  const metric = buildMetric(
    category,
    data,
    knowledgeTotals,
    data.externalSources
  );

  const initial: SushiState = {
    levels: data.upgradeLevels.slice(),
    spent: 0,
  };

  // ---- Domain-specific gates ----
  const researchLevelGate: GateFn<SushiState> = (slot, state) => {
    const upgIdx = slotUpgIdx(slot);
    const lv = state.levels[upgIdx] ?? 0;
    if (data.researchLevel < upgLvReq(slot) && lv === 0) {
      return { ok: false, reason: "locked" };
    }
    return { ok: true };
  };

  const chainGate: GateFn<SushiState> = (slot, state) => {
    if (slot === 0) {
      return { ok: true };
    }
    const prevLv = state.levels[slotUpgIdx(slot - 1)] ?? 0;
    const lv = state.levels[slotUpgIdx(slot)] ?? 0;
    if (prevLv === 0 && lv === 0) {
      return { ok: false, reason: "locked" };
    }
    return { ok: true };
  };

  const slotExistsGate: GateFn<SushiState> = (slot) => {
    const upg = SUSHI_UPG[slotUpgIdx(slot)];
    return upg ? { ok: true } : { ok: false, reason: "locked" };
  };

  const maxed = maxedGate<SushiState>(
    (slot, s) => s.levels[slotUpgIdx(slot)] ?? 0,
    (slot) => SUSHI_UPG[slotUpgIdx(slot)]?.[1] ?? 0,
    MAX_LEVEL_INFINITE
  );

  const affordability = affordabilityGate<SushiState>(
    () => onlyAffordable,
    (slot, s) => {
      const cost = upgCost(slot, s.levels, knowledgeTotals, uniqueSushi);
      return Number.isFinite(cost) && cost <= data.bucks - s.spent;
    }
  );

  const steps = computePath<SushiState>({
    initialState: initial,
    slotCount: SLOT_TO_UPG.length,
    maxSteps,
    gates: [slotExistsGate, maxed, researchLevelGate, chainGate, affordability],
    score: (slot, s) => upgCost(slot, s.levels, knowledgeTotals, uniqueSushi),
    gain: (slot, s) => {
      if (!metric) {
        return null;
      }
      const baseline = metric(s.levels);
      const sim = s.levels.slice();
      const upgIdx = slotUpgIdx(slot);
      const lv = sim[upgIdx] ?? 0;
      sim[upgIdx] = lv + 1;
      const next = metric(sim);
      const gainValue = next - baseline;
      return Number.isFinite(gainValue) && gainValue > 0 ? gainValue : 0;
    },
    apply: (slot, s) => {
      const cost = upgCost(slot, s.levels, knowledgeTotals, uniqueSushi);
      const next = s.levels.slice();
      const upgIdx = slotUpgIdx(slot);
      next[upgIdx] = (next[upgIdx] ?? 0) + 1;
      return { levels: next, spent: s.spent + cost };
    },
    resourceOf: (slot, s) => ({
      id: RESOURCE_ID,
      cost: upgCost(slot, s.levels, knowledgeTotals, uniqueSushi),
    }),
    nameOf: (slot) => SUSHI_UPG[slotUpgIdx(slot)]?.[0] ?? "",
    fromLevel: (slot, s) => s.levels[slotUpgIdx(slot)] ?? 0,
  });

  return steps;
}
