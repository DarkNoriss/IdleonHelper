export type TesseractUpgradeDef = {
  index: number;
  name: string;
  description: string;
  x1: number; // cost coefficient
  x2: number; // cost coefficient
  x3: number; // 0..5 - tachyon type (purple/brown/green/red/silver/gold)
  x4: number; // max level
  x5: number; // bonus per level
  x6: number; // unlock threshold (totalUpgradeLevels >= x6 -> unlocked)
};

export type TesseractData = {
  upgradeLevels: number[];
  totalUpgradeLevels: number;
  tachyons: [number, number, number, number, number, number];
  unlockedIndices: ReadonlySet<number>;
  // Daily-discounts state - same shape compass uses.
  dailyDiscountsRemaining: number;
  dailyDiscountsMax: number;
  hasLegendTalent: boolean;
  hasBonusBundle: boolean;
  first3mcMultiplier: number;
  raw: unknown;
};

export type TesseractCategory =
  | "all"
  | "damage"
  | "accuracy"
  | "defence"
  | "crit"
  | "attackSpeed"
  | "tachyons";

// Numeric values match def.x3 so the optimizer can compare directly.
export type TesseractTachyonFilter = "all" | 0 | 1 | 2 | 3 | 4 | 5;

export type TesseractStats = {
  damage: number;
  accuracy: number;
  defence: number;
  critPct: number;
  critDamage: number;
  attackSpeed: number;
};

export type TesseractRphRates = {
  0: number;
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type TesseractOptimizerScoreMode = "cost" | "perHour";

export type TesseractOptimizerInput = {
  data: TesseractData;
  category: TesseractCategory;
  scoreMode: TesseractOptimizerScoreMode;
  rph: TesseractRphRates;
  tachyonFilter: TesseractTachyonFilter;
  maxSteps: number;
  groupMode: "none" | "upgrade" | "summary";
  onlyAffordable: boolean;
};
