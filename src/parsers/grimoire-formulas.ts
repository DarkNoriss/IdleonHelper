import type {
  GrimoireData,
  GrimoireStats,
  GrimoireUpgradeDef,
} from "@/types/grimoire";
import { GRIMOIRE_UPGRADE_DEFS } from "./grimoire-data";
import { lavaLog } from "./lava-log";
import { getMasterclassCostReduction } from "./masterclass-cost-reduction";

// Indices whose bonus is "self" (level * x5) and NOT modulated by bonus(36).
// Verbatim from toolbox grimoire.ts:253-258 conditional.
const SELF_MULTIPLIER_INDICES = new Set<number>([
  9, 11, 17, 26, 32, 36, 39, 45,
]);

function levelOf(state: GrimoireData, index: number): number {
  return state.upgradeLevels[index] ?? 0;
}

function defOf(index: number): GrimoireUpgradeDef | undefined {
  return GRIMOIRE_UPGRADE_DEFS[index];
}

// Toolbox calcGrimoireBonus(upgrades, index). Recursion terminates because 36
// is in SELF_MULTIPLIER_INDICES (depth <= 1).
export function calcGrimoireBonus(state: GrimoireData, index: number): number {
  const def = defOf(index);
  if (!def) {
    return 0;
  }
  const level = levelOf(state, index);
  const base = level * def.x5;
  if (SELF_MULTIPLIER_INDICES.has(index)) {
    return base;
  }
  return base * (1 + calcGrimoireBonus(state, 36) / 100);
}

// Toolbox getUpgradeCost - verbatim port. DO NOT re-parenthesize.
// Differences vs tesseract:
//   - Base growth 1.05 (not 1.04)
//   - No reductionFactor (no self-bonus that scales with bones)
export function getUpgradeCost(
  state: GrimoireData,
  index: number,
  forceLegendTalent: boolean
): number {
  const def = defOf(index);
  if (!def) {
    return Number.POSITIVE_INFINITY;
  }
  const level = levelOf(state, index);
  // Optimizer-side guard - toolbox returns the formula at any level; we cap
  // at max so the optimizer cannot purchase past it. Mirrors tesseract.
  if (level >= def.x4) {
    return Number.POSITIVE_INFINITY;
  }

  const masterclassReduction = getMasterclassCostReduction(
    state,
    forceLegendTalent
  );

  return (
    3 *
    masterclassReduction *
    1.05 ** index *
    (level + (def.x1 + level) * (def.x2 + 0.01) ** level)
  );
}

// Toolbox getWraithStats - externals-stripped port. See spec section 4.3 for
// reasoning. Per-bone-to-bonus map:
//   damage     bonus(18) * lavaLog(bones[0]=femur)
//   defence    bonus(27) * lavaLog(bones[1]=ribcage)
//   accuracy   bonus(41) * lavaLog(bones[2]=cranium)
//   extraBones bonus(48) * lavaLog(bones[3]=bovinae)
// Kill-count modulators (kc[0..2]) snapshot from OptLacc[334..336] sit inside
// the damage chain via bonuses 13/21/31.
export function getWraithStats(state: GrimoireData): GrimoireStats {
  const b = (i: number) => calcGrimoireBonus(state, i);
  const femurLog = lavaLog(state.bones[0] ?? 0);
  const ribcageLog = lavaLog(state.bones[1] ?? 0);
  const craniumLog = lavaLog(state.bones[2] ?? 0);
  const bovinaeLog = lavaLog(state.bones[3] ?? 0);
  const kc = state.killCounts;

  // hp: base 10 + chain1 [3,19,34,42], multiplied by (1 + (bonus(7)+bonus(38))/100).
  // Toolbox also multiplies by (1 + bulwarkStyle*total/10000) - dropped.
  const hp = (10 + (b(3) + b(19) + b(34) + b(42))) * (1 + (b(7) + b(38)) / 100);

  // damage: base 5 + chain1 [0,6,16,33,46], multiplied by:
  //   (1 + (bonus(8)+bonus(28)+bonus(43)+bonus(50))/100)
  //   (1 + (kc[0]*bonus(13) + kc[1]*bonus(21) + kc[2]*bonus(31))/100)
  //   (1 + bonus(18)*femurLog/100)
  // Toolbox also has wraithForm and marauderStyle factors - dropped.
  const damage =
    (5 + (b(0) + b(6) + b(16) + b(33) + b(46))) *
    (1 + (b(8) + b(28) + b(43) + b(50)) / 100) *
    (1 + (kc[0] * b(13) + kc[1] * b(21) + kc[2] * b(31)) / 100) *
    (1 + (b(18) * femurLog) / 100);

  // accuracy: base 2 + chain1 [1,12,25,37,47], multiplied by:
  //   (1 + (bonus(7)+bonus(38))/100)
  //   (1 + bonus(41)*craniumLog/100)
  // Toolbox also has marauderStyle - dropped.
  const accuracy =
    (2 + (b(1) + b(12) + b(25) + b(37) + b(47))) *
    (1 + (b(7) + b(38)) / 100) *
    (1 + (b(41) * craniumLog) / 100);

  // defence: chain1 [2,15,30,40,49] (no base), multiplied by:
  //   (1 + (bonus(7)+bonus(38))/100)
  //   (1 + bonus(27)*ribcageLog/100)
  // Toolbox also has bulwarkStyle - dropped.
  const defence =
    (b(2) + b(15) + b(30) + b(40) + b(49)) *
    (1 + (b(7) + b(38)) / 100) *
    (1 + (b(27) * ribcageLog) / 100);

  // crit: base 10 + bonus(10). Toolbox adds famineFishX*lavaLog(1)=0 - dropped.
  const critChance = 10 + b(10);
  // Toolbox: 1 + (25 + bonus(20) + famineFishY*lavaLog(1))/100. lavaLog(1)=0.
  const critDamage = 1 + (25 + b(20)) / 100;

  // extraBones: 1 + (bonus(23) + bonus(48)*bovinaeLog) / 100. All other
  // factors in getExtraBonesBonus (talent grimoire, gambit, gear, emperor,
  // graveyardShift) are constants and drop in percentChange ranking.
  const extraBones = 1 + (b(23) + b(48) * bovinaeLog) / 100;

  return {
    hp,
    damage,
    accuracy,
    defence,
    critChance,
    critDamage,
    extraBones,
  };
}
