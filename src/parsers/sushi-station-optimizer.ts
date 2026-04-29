import type {
  ComputePathInput,
  OptimizerCategory,
  OptimizerStep,
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
  // fuelCap
  return (levels) => fuelCapacity(levels, knowledgeTotals, data.hasBundleV);
}

export function computePath(input: ComputePathInput): OptimizerStep[] {
  const { data, category, maxSteps, onlyAffordable } = input;

  const levels = data.upgradeLevels.slice();
  const knowledgeTotals = knowledgeBonusTotals(data.rawSushiData);
  const uniqueSushi = computeUniqueSushi(data.rawSushiData);
  const metric = buildMetric(
    category,
    data,
    knowledgeTotals,
    data.externalSources
  );

  let spent = 0;
  const steps: OptimizerStep[] = [];

  for (let step = 1; step <= maxSteps; step++) {
    const baseline = metric ? metric(levels) : 0;

    let bestSlot = -1;
    let bestCost = 0;
    let bestGain: number | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let slot = 0; slot < SLOT_TO_UPG.length; slot++) {
      const upgIdx = slotUpgIdx(slot);
      const upg = SUSHI_UPG[upgIdx];
      if (!upg) {
        continue;
      }
      const lv = levels[upgIdx] ?? 0;
      const maxLv = upg[1];

      // (1) skip maxed (treat 9999 as infinite)
      if (lv >= maxLv && maxLv < MAX_LEVEL_INFINITE) {
        continue;
      }
      // (2) research-level lock — locked unless already past level 0
      if (data.researchLevel < upgLvReq(slot) && lv === 0) {
        continue;
      }
      // (3) sequential-chain lock
      const prevLv = slot > 0 ? (levels[slotUpgIdx(slot - 1)] ?? 0) : 1;
      if (prevLv === 0 && lv === 0) {
        continue;
      }

      const cost = upgCost(slot, levels, knowledgeTotals, uniqueSushi);
      // (4) cost floor
      if (!Number.isFinite(cost) || cost <= 0) {
        continue;
      }
      // (5) affordability
      if (onlyAffordable && cost > data.bucks - spent) {
        continue;
      }

      let gain: number | null = null;
      let score: number;
      if (metric) {
        const sim = levels.slice();
        sim[upgIdx] = lv + 1;
        const next = metric(sim);
        gain = next - baseline;
        // (6) skip non-positive gain or NaN
        if (!Number.isFinite(gain) || gain <= 0) {
          continue;
        }
        score = gain / cost;
      } else {
        // "all" category: cheapest first; tie-break by slot ascending
        score = -cost;
      }

      if (score > bestScore) {
        bestScore = score;
        bestSlot = slot;
        bestCost = cost;
        bestGain = gain;
      }
    }

    if (bestSlot === -1) {
      break;
    }

    const upgIdx = slotUpgIdx(bestSlot);
    const fromLevel = levels[upgIdx] ?? 0;
    const toLevel = fromLevel + 1;
    levels[upgIdx] = toLevel;
    spent += bestCost;

    // upgIdx is guaranteed valid: bestSlot was only set when SUSHI_UPG[upgIdx] was truthy
    const bestUpg = SUSHI_UPG[upgIdx] as (typeof SUSHI_UPG)[number];
    steps.push({
      rank: step,
      slot: bestSlot,
      name: bestUpg[0],
      fromLevel,
      toLevel,
      cost: bestCost,
      gain: bestGain,
      efficiency: bestGain === null ? null : bestGain / bestCost,
      cumulativeCost: spent,
    });
  }

  return steps;
}
