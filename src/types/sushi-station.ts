import type { ExternalSources } from "@/parsers/sushi-station-formulas";

// Re-export the optimizer-core types so existing imports keep working.
export type {
  OptimizerGroupMode,
  OptimizerRow,
  OptimizerStep,
} from "@/parsers/optimizer-core";

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
  /** Current fuel from Sushi[4][0]. Display-only; not used by optimizer. */
  fuelCurrent: number;
  /** External multiplier inputs to bucks-per-hr metric. Most fields default
   *  to 0 in v1 (per port-source.md open issue #2). */
  externalSources: ExternalSources;
};

export type OptimizerCategory = "all" | "bucks" | "fuelRate" | "fuelCap";

export const OPTIMIZER_MAX_STEPS_OPTIONS = [10, 25, 50, 100, 300] as const;
// Toolbar accepts both presets and arbitrary user-typed positive integers
// via its "custom" option, so this is `number` rather than the preset union.
export type OptimizerMaxSteps = number;

export type ComputePathInput = {
  data: SushiStationData;
  category: OptimizerCategory;
  maxSteps: OptimizerMaxSteps;
  onlyAffordable: boolean;
};
