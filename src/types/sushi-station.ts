import type { ExternalSources } from "@/parsers/sushi-station-formulas";

export type SushiStationData = {
  /** Length = SUSHI_UPG.length (typically ~45). Indexed by upgrade index. */
  upgradeLevels: number[];
  /** Current spendable currency. */
  bucks: number;
  /** Player research level — gates upgrade unlocks. */
  researchLevel: number;
  /** Knowledge category 6 % discount input to `upgCost`. */
  knowledgeCat6Total: number;
  /** Rest-of-Game bonus 26 % discount input to `upgCost`. */
  rogBonus26: number;
  /**
   * Raw per-slot sushi state from the save. Shape is whatever the metric
   * formulas need; ported as-is from the research-optimizer's `sd` parameter.
   * Concrete fields enumerated in port-source.md during Task 1.
   */
  rawSushiData: unknown;
  /** Bundle V ownership — input to fuel formulas. */
  hasBundleV: boolean;
  /** Sparks count — input to fireplace effect base. */
  sparks: number;
  /** External multiplier inputs to bucks-per-hr metric. Most fields default
   *  to 0 in v1 (per port-source.md open issue #2). */
  externalSources: ExternalSources;
};

export type OptimizerCategory = "all" | "bucks" | "fuelRate" | "fuelCap";

export const OPTIMIZER_MAX_STEPS_OPTIONS = [10, 25, 50, 100, 300] as const;
export type OptimizerMaxSteps = (typeof OPTIMIZER_MAX_STEPS_OPTIONS)[number];

export type OptimizerStep = {
  /** 1-indexed step in the path. */
  rank: number;
  /** Slot index (0..SLOT_TO_UPG.length - 1). */
  slot: number;
  /** Display name from SUSHI_UPG[upgIdx][0]. */
  name: string;
  fromLevel: number;
  toLevel: number;
  /** Cost of THIS single level-up at simulation time. */
  cost: number;
  /** Metric delta. `null` for category "all". */
  gain: number | null;
  /** `gain / cost`. `null` for category "all". */
  efficiency: number | null;
  /** Running sum of `cost` across the path. */
  cumulativeCost: number;
};

export type ComputePathInput = {
  data: SushiStationData;
  category: OptimizerCategory;
  maxSteps: OptimizerMaxSteps;
  onlyAffordable: boolean;
};
