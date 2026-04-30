import type { TesseractData, TesseractUpgradeDef } from "@/types/tesseract";
import { TESSERACT_UPGRADE_DEFS } from "./tesseract-data";

// Toolbox utility - log10 with floor at 0 for inputs <= 1. Same impl as
// compass-formulas.ts:344-348. Duplicated rather than exported until a
// third optimizer (grimoire) needs it (YAGNI).
function lavaLog(value: number): number {
  if (value <= 1) {
    return 0;
  }
  return Math.log10(value);
}

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
