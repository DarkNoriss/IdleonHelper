import type { GrimoireData, GrimoireUpgradeDef } from "@/types/grimoire";
import { GRIMOIRE_UPGRADE_DEFS } from "./grimoire-data";
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
