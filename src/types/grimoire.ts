export type GrimoireUpgradeDef = {
  index: number;
  name: string;
  description: string;
  x1: number; // cost coefficient
  x2: number; // cost coefficient
  boneType: number; // 0..3 - bone currency (femur/ribcage/cranium/bovinae)
  x4: number; // max level
  x5: number; // bonus per level
  unlockLevel: number; // totalUpgradeLevels >= unlockLevel -> unlocked
  x7: number; // unused in formulas
  x8: number; // unused in formulas
};

export type GrimoireData = {
  upgradeLevels: number[]; // from save Grimoire (~100 slots)
  totalUpgradeLevels: number; // sum of upgradeLevels
  bones: [number, number, number, number]; // OptLacc[330..333]
  killCounts: [number, number, number]; // OptLacc[334..336] - damage modulators
  unlockedIndices: ReadonlySet<number>;
  // Daily-discounts state - same shape compass + tesseract use.
  dailyDiscountsRemaining: number;
  dailyDiscountsMax: number;
  hasLegendTalent: boolean;
  hasBonusBundle: boolean;
  first3mcMultiplier: number;
  raw: unknown;
};

export type GrimoireCategory =
  | "all"
  | "damage"
  | "accuracy"
  | "defence"
  | "hp"
  | "crit"
  | "extraBones";

export type GrimoireStats = {
  hp: number;
  damage: number;
  accuracy: number;
  defence: number;
  critChance: number;
  critDamage: number;
  extraBones: number;
};

export type GrimoireRphRates = {
  0: number;
  1: number;
  2: number;
  3: number;
};

// No scoreMode field - grimoire optimizes by per-hour cost only. Cost-only
// ranking proved uninformative across compass + tesseract.
export type GrimoireOptimizerInput = {
  data: GrimoireData;
  category: GrimoireCategory;
  rph: GrimoireRphRates;
  // Sorted resource indices (def.boneType values 0..3) that should be
  // EXCLUDED from picks. Empty array = consider every bone.
  disabledBones: readonly number[];
  maxSteps: number;
  groupMode: "none" | "upgrade" | "summary";
  onlyAffordable: boolean;
};
