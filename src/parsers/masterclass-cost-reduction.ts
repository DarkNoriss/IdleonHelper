// Verbatim port of the game's `getMasterclassCostReduction`. Picks the discount
// multiplier from the (forceLegendTalent x hasBonusBundle) pair, then composes
// with the always-on first3mcCostRedux multiplier.
// Hoisted from compass-formulas.ts + tesseract-formulas.ts (third-copy threshold).

type MasterclassCostInput = {
  hasBonusBundle: boolean;
  first3mcMultiplier: number;
};

export function getMasterclassCostReduction(
  input: MasterclassCostInput,
  forceLegendTalent: boolean
): number {
  let allMcRedux: number;
  if (forceLegendTalent) {
    allMcRedux = input.hasBonusBundle ? 0.05 : 0.2;
  } else {
    allMcRedux = input.hasBonusBundle ? 0.25 : 1;
  }
  return allMcRedux * input.first3mcMultiplier;
}
