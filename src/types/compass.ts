export type CompassUpgrade = {
  name: string;
  change: number;
};

export type MinorNodeDef = {
  id: string;
  image: string;
  offset: { x: number; y: number };
};

export type CompassNodeDef = {
  id: string;
  label: string;
  image: string;
  minorNodes?: MinorNodeDef[];
};

export type CompassNodeGroup = {
  id: string;
  label: string;
  nodes: CompassNodeDef[];
};

export type MinorNodeWithParent = MinorNodeDef & { parent: string };

// ---- Optimizer types (additions; do not modify existing CompassUpgrade) ----

export type CompassUpgradeDef = {
  index: number;
  name: string;
  description: string;
  x1: number;
  x2: number;
  x3: number;
  x4: number;
  x5: number;
  x9: 0 | 1;
  x10: number;
  baseIconIndex?: number;
};

export type CompassData = {
  upgradeLevels: number[];
  dusts: [number, number, number, number, number];
  totalDustsCollected: number;

  // Set of upgrade indices the user has unlocked. Locked upgrades never
  // appear in the game's optimizer either — they're not in groupedUpgrades.
  unlockedIndices: ReadonlySet<number>;

  // Daily Shopping Spree (legend talent 23) — first N upgrades per day are
  // 80% cheaper (95% with bundle). `dailyDiscountsRemaining` is uses-left
  // today; `dailyDiscountsMax` is the talent's full bonus (8 * level).
  dailyDiscountsRemaining: number;
  dailyDiscountsMax: number;
  dailyDiscountsResetAt: number | null;

  hasLegendTalent: boolean;
  hasBonusBundle: boolean;

  // first3mcCostRedux multiplier from `OptLacc[499]` — 1 / (1 + opt499/100).
  // Always applied regardless of legend-talent state.
  first3mcMultiplier: number;

  serverDustCost: number;
  raw: unknown;
};

export type CompassCategory =
  | "all"
  | "damage"
  | "dust"
  | "accuracy"
  | "defence"
  | "crit"
  | "attackSpeed"
  | "hp";

export type CompassStats = {
  hp: number;
  damage: number;
  accuracy: number;
  defence: number;
  critPct: number;
  critDamage: number;
  attackSpeed: number;
  mastery: number;
  multi: number;
};

export type CompassOptimizerScoreMode = "cost" | "perHour";

export type CompassRphRates = {
  0: number;
  1: number;
  2: number;
  3: number;
  4: number;
};

export const COMPASS_MAX_STEPS_PRESETS = [10, 25, 50, 100, 300] as const;

// Accepts any user-typed positive integer in addition to the presets. The
// toolbar enforces a sane floor/ceiling.
export type CompassOptimizerInput = {
  data: CompassData;
  category: CompassCategory;
  scoreMode: CompassOptimizerScoreMode;
  rph: CompassRphRates;
  // Sorted resource indices (def.x3 values 0..4) that should be EXCLUDED
  // from picks. Empty array = consider every dust.
  disabledDusts: readonly number[];
  maxSteps: number;
  groupMode: "none" | "upgrade" | "summary";
  onlyAffordable: boolean;
};
