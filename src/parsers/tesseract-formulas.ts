import type {
  TesseractData,
  TesseractStats,
  TesseractUpgradeDef,
} from "@/types/tesseract";
import { lavaLog } from "./lava-log";
import { TESSERACT_UPGRADE_DEFS } from "./tesseract-data";

// Indices whose bonus is "self" (level * x5) and NOT modulated by
// bonus(39). Verbatim from toolbox tesseract.ts:564-569.
const SELF_MULTIPLIER_INDICES = new Set<number>([
  3, 7, 8, 10, 13, 16, 20, 25, 26, 28, 33, 35, 39, 40, 43, 45, 48, 57, 58,
]);

function levelOf(state: TesseractData, index: number): number {
  return state.upgradeLevels[index] ?? 0;
}

function defOf(index: number): TesseractUpgradeDef | undefined {
  return TESSERACT_UPGRADE_DEFS[index];
}

// Toolbox calcTesseractBonus(upgrades, index, 0). The `anotherIndex === 999`
// branch in toolbox is only used by description rendering; we drop it.
// Recursion terminates because 39 is in SELF_MULTIPLIER_INDICES (depth <= 1).
export function calcTesseractBonus(
  state: TesseractData,
  index: number
): number {
  const def = defOf(index);
  if (!def) {
    return 0;
  }
  const level = levelOf(state, index);
  const base = level * def.x5;
  if (SELF_MULTIPLIER_INDICES.has(index)) {
    return base;
  }
  return base * (1 + calcTesseractBonus(state, 39) / 100);
}

// Toolbox getTesseractBonusAtLevel - projects calcTesseractBonus with a
// modified level for `index`.
export function getTesseractBonusAtLevel(
  state: TesseractData,
  index: number,
  levelOverride: number
): number {
  const projected: TesseractData = {
    ...state,
    upgradeLevels: state.upgradeLevels.map((lv, i) =>
      i === index ? levelOverride : lv
    ),
  };
  return calcTesseractBonus(projected, index);
}

// Toolbox getUpgradeCost - verbatim port. opt[392] = silver tachyons
// (388+4=392, tachyonNames[4]=Silver). Cost reduction (bonus 49) scales by
// lavaLog(silver_count). DO NOT re-parenthesize.
export function getUpgradeCost(
  state: TesseractData,
  index: number,
  forceLegendTalent: boolean
): number {
  const def = defOf(index);
  if (!def) {
    return Number.POSITIVE_INFINITY;
  }
  const level = levelOf(state, index);
  if (level >= def.x4) {
    return Number.POSITIVE_INFINITY;
  }

  // getMasterclassCostReduction (toolbox misc.ts:217-227). Inline copy of
  // compass-formulas.ts:159-165 - duplicated until grimoire phase.
  let allMcRedux: number;
  if (forceLegendTalent) {
    allMcRedux = state.hasBonusBundle ? 0.05 : 0.2;
  } else {
    allMcRedux = state.hasBonusBundle ? 0.25 : 1;
  }
  const masterclassReduction = allMcRedux * state.first3mcMultiplier;

  const bonus49 = calcTesseractBonus(state, 49);
  const silverTachyons = state.tachyons[4] ?? 0;
  const reductionFactor = 1 / (1 + (bonus49 * lavaLog(silverTachyons)) / 100);

  return (
    3 *
    masterclassReduction *
    reductionFactor *
    1.04 ** index *
    (level + (def.x1 + level) * (def.x2 + 0.01) ** level)
  );
}

// Toolbox getArcanistStats - externals-stripped port. See spec section 4.4 for
// reasoning. Per-tachyon-to-bonus map:
//   damage    bonus(12) * lavaLog(opt[388]=purple)
//   accuracy  bonus(27) * lavaLog(opt[389]=brown)
//   defence   bonus(41) * lavaLog(opt[391]=red)
export function getArcanistStats(state: TesseractData): TesseractStats {
  const b = (i: number) => calcTesseractBonus(state, i);
  const purpleLog = lavaLog(state.tachyons[0] ?? 0);
  const brownLog = lavaLog(state.tachyons[1] ?? 0);
  const redLog = lavaLog(state.tachyons[3] ?? 0);

  // damage chain: base 5 + sum_chain1 [0,6,15,36,50] additive,
  // multiplied by (1 + (bonus(12)*purpleLog + chain2 [4,24,31,42,53]) / 100)
  const damage =
    (5 + (b(0) + b(6) + b(15) + b(36) + b(50))) *
    (1 + (b(12) * purpleLog + b(4) + b(24) + b(31) + b(42) + b(53)) / 100);

  // accuracy chain: base 2 + sum [1,9,19,38,52], multiplied by
  // (1 + (bonus(22)+bonus(44)+bonus(55)) / 100) * (1 + bonus(27)*brownLog/100)
  const accuracy =
    (2 + (b(1) + b(9) + b(19) + b(38) + b(52))) *
    (1 + (b(22) + b(44) + b(55)) / 100) *
    (1 + (b(27) * brownLog) / 100);

  // defence chain: sum [2,11,29,46], multiplied by
  // (1 + (bonus(22)+bonus(44)+bonus(55))/100) * (1 + bonus(41)*redLog/100)
  const defence =
    (b(2) + b(11) + b(29) + b(46)) *
    (1 + (b(22) + b(44) + b(55)) / 100) *
    (1 + (b(41) * redLog) / 100);

  // crit: base 5 + bonus(8). Toolbox also adds labotomizer*lab/10 - dropped.
  const critPct = 5 + b(8);
  const critDamage = 1 + (20 + b(14)) / 100;

  // attackSpeed: just bonus(21). Toolbox adds ghastlyPowerY*total/100 - dropped.
  const attackSpeed = b(21);

  return { damage, accuracy, defence, critPct, critDamage, attackSpeed };
}

// Toolbox getExtraTachyon - externals-stripped port. KEEP only:
//   bonus(17) + bonus(34)*lavaLog(opt[390]=green) + bonus(56)*lavaLog(opt[393]=gold)
// DROP: TESSERACT talent, gear (slot 95), arcadeBonus, jewelBonus,
//       emperorBonus, charmBonus, backupEnergy, bundleBonus.
// All dropped factors are state-independent within a single upgrade step
// -> they cancel in (after - before) / before.
export function getExtraTachyonGain(state: TesseractData): number {
  const greenLog = lavaLog(state.tachyons[2] ?? 0);
  const goldLog = lavaLog(state.tachyons[5] ?? 0);
  const additive =
    calcTesseractBonus(state, 17) +
    calcTesseractBonus(state, 34) * greenLog +
    calcTesseractBonus(state, 56) * goldLog;
  return 1 + additive / 100;
}
