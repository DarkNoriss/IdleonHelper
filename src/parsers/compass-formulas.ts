import type { CompassData, CompassStats } from "@/types/compass";
import { COMPASS_RANDOM_LIST, COMPASS_UPGRADE_DEFS } from "./compass-data";
import { lavaLog } from "./lava-log";
import { getMasterclassCostReduction } from "./masterclass-cost-reduction";

const DUST_COST_FLOOR = 6.2;
const PATH_RANDO_BASE = 3.69;
const RANDO_LIST_LENGTH_DIVISOR = 27;

// Verbatim port of the game's compass local-bonus formula. DO NOT re-parenthesize.
// Note: the game stores `level` on the upgrade; here, level lives in
// `state.upgradeLevels[index]`. Only the access pattern changes.
export function getLocalCompassBonus(
  state: CompassData,
  index: number
): number {
  const def = COMPASS_UPGRADE_DEFS[index];
  if (!def) {
    return 0;
  }
  const level = state.upgradeLevels[index] ?? 0;

  if (def.x9 === 1) {
    return (
      (1 +
        (getLocalCompassBonus(state, 39) + getLocalCompassBonus(state, 80)) /
          100) *
      level *
      def.x5
    );
  }
  if (index === 45) {
    return level * def.x5 * 2 ** Math.floor(level / 50);
  }
  return level * def.x5;
}

// Same as getLocalCompassBonus but with a level override for the target index.
export function getCompassBonusAtLevel(
  state: CompassData,
  index: number,
  levelOverride: number
): number {
  const overriddenLevels = state.upgradeLevels.slice();
  overriddenLevels[index] = levelOverride;
  return getLocalCompassBonus(
    { ...state, upgradeLevels: overriddenLevels },
    index
  );
}

// Verbatim port of the game's compass upgrade-cost formula. Returns INFINITY
// when maxed.
//
// `forceLegendTalent` mirrors the game's `getMasterclassCostReduction` param:
// when true, the legend talent IS active (first-N upgrades of the day);
// when false, it is NOT (24th onwards). The optimizer flips this per step
// based on `dailyDiscountsRemaining`.
export function getUpgradeCost(
  state: CompassData,
  index: number,
  forceLegendTalent: boolean
): number {
  const def = COMPASS_UPGRADE_DEFS[index];
  if (!def) {
    return Number.POSITIVE_INFINITY;
  }
  const level = state.upgradeLevels[index] ?? 0;
  if (level >= def.x4) {
    return Number.POSITIVE_INFINITY;
  }

  // Per-target redCost — the game switches on indices 45/43/48/57/51/54.
  let redCost = 1;
  switch (index) {
    case 45:
      redCost =
        1 +
        (getLocalCompassBonus(state, 151) +
          getLocalCompassBonus(state, 152) +
          getLocalCompassBonus(state, 153)) /
          100;
      break;
    case 43:
      redCost =
        1 +
        (getLocalCompassBonus(state, 154) + getLocalCompassBonus(state, 156)) /
          100;
      break;
    case 48:
      redCost =
        1 +
        (getLocalCompassBonus(state, 155) +
          getLocalCompassBonus(state, 157) +
          getLocalCompassBonus(state, 158)) /
          100;
      break;
    case 57:
      redCost =
        1 +
        (getLocalCompassBonus(state, 159) +
          getLocalCompassBonus(state, 160) +
          getLocalCompassBonus(state, 161) +
          getLocalCompassBonus(state, 168)) /
          100;
      break;
    case 51:
      redCost =
        1 +
        (getLocalCompassBonus(state, 162) +
          getLocalCompassBonus(state, 163) +
          getLocalCompassBonus(state, 164) +
          getLocalCompassBonus(state, 166) +
          getLocalCompassBonus(state, 167)) /
          100;
      break;
    case 54:
      redCost =
        1 +
        (getLocalCompassBonus(state, 165) + getLocalCompassBonus(state, 169)) /
          100;
      break;
    default:
      redCost = 1;
      break;
  }

  // Surplus cost for "Path" upgrades.
  // Note: the game checks `compassUpgPath.includes('Path')` against `x10`
  // stringified. In our data x10 is a number (path index 0..N). The game's
  // check effectively only triggers when x10 is the literal string 'Path*';
  // since our defs store numeric x10, surplusCost is always 0 by this rule.
  // Preserved for parity in case the game's data switches back.
  let surplusCost = 0;
  if (String(def.x10).includes("Path")) {
    surplusCost = ((3 * level) ** 2 + 12 * level) * 1.1 ** level;
  }

  // Clamp serverDustCost above floor (already clamped at parse, re-clamp
  // defensively).
  const dustCost = Math.max(state.serverDustCost, DUST_COST_FLOOR);

  // Bonus reduction from upgrades 36 + 77.
  const bonusReduction =
    1 +
    (getLocalCompassBonus(state, 36) + getLocalCompassBonus(state, 77)) / 100;

  // Path randoMultiplier. randomList is baked into compass-data.ts (the game
  // keeps it alongside its other static data tables, not in saves).
  // Indexed by `def.x10` directly (we already sliced from the game's index 105).
  const randoList = COMPASS_RANDOM_LIST[Math.round(def.x10)] ?? [];
  const idxInList = randoList.indexOf(String(index));
  const randoMultiplier = Math.max(
    1,
    (PATH_RANDO_BASE - randoList.length / RANDO_LIST_LENGTH_DIVISOR) **
      idxInList
  );

  const masterclassMultiplier = getMasterclassCostReduction(
    state,
    forceLegendTalent
  );

  // Final cost. DO NOT re-parenthesize.
  return (
    masterclassMultiplier *
    (surplusCost +
      dustCost *
        (1 / bonusReduction) *
        (1 / Math.max(1, redCost)) *
        (def.x1 / 2) *
        randoMultiplier *
        def.x2 ** level)
  );
}

// ---- Stats + categoryGain (Task 1.6) ----

// Verbatim port of the game's `getCompassStats`, with external state zeroed
// (talents, gear, breeding, medallions, accountOptions[232]). Compass-internal
// chains preserved so upgrades like 23 (Cooldust Hoarding) and 78
// (`78 * lavaLog(hp)`) score correctly.
//
// The game writes the chains as `(a + (b + (c + ...)))` for historical reasons.
// `+` is associative so the flat form `a + b + c + ...` is mathematically
// identical and easier to maintain. The only non-additive term is
// `bonus(78) * lavaLog(hp)` (and equivalents); operator precedence gives `*`
// higher binding so the flat form preserves it.
export function getCompassStats(state: CompassData): CompassStats {
  const stardust = state.dusts[0];
  const moondust = state.dusts[1];
  const cooldust = state.dusts[3];

  // HP.
  const hp =
    (10 + getLocalCompassBonus(state, 28) + getLocalCompassBonus(state, 87)) *
    (1 +
      (getLocalCompassBonus(state, 140) +
        getLocalCompassBonus(state, 146) +
        getLocalCompassBonus(state, 92)) /
        100);

  // Damage.
  // Dropped externals:
  //   `Math.pow(1.05, equipmentWeaponPower)` -> 1
  //   `(1 + equipBonus4 / 100)` -> 1
  //   `Math.pow(1 + bonus(26)/100, accountOptions[232])` -> 1 (exp=0)
  //   `(1 + bonus(6) * totalAcquiredMedallions / 100)` -> 1
  //   `tempestTalent` -> 0
  const damageBase =
    5 +
    getLocalCompassBonus(state, 14) +
    getLocalCompassBonus(state, 15) +
    getLocalCompassBonus(state, 24) +
    getLocalCompassBonus(state, 60) +
    getLocalCompassBonus(state, 81);
  const damageMul1 =
    1 + (getLocalCompassBonus(state, 23) * lavaLog(cooldust)) / 100;
  const damageChain =
    getLocalCompassBonus(state, 119) +
    getLocalCompassBonus(state, 10) +
    getLocalCompassBonus(state, 121) +
    getLocalCompassBonus(state, 122) +
    getLocalCompassBonus(state, 123) +
    getLocalCompassBonus(state, 126) +
    getLocalCompassBonus(state, 127) +
    getLocalCompassBonus(state, 129) +
    getLocalCompassBonus(state, 130) +
    getLocalCompassBonus(state, 132) +
    getLocalCompassBonus(state, 135) +
    getLocalCompassBonus(state, 64) +
    getLocalCompassBonus(state, 78) * lavaLog(hp) +
    getLocalCompassBonus(state, 85) +
    getLocalCompassBonus(state, 94);
  const damage = damageBase * damageMul1 * (1 + damageChain / 100);

  // Accuracy. Dropped: defenceAndAccTalent, medallions, equipBonus.
  const accuracyBase =
    3 +
    getLocalCompassBonus(state, 17) +
    getLocalCompassBonus(state, 19) +
    getLocalCompassBonus(state, 25) +
    getLocalCompassBonus(state, 61);
  const accuracyMul1 =
    1 + (getLocalCompassBonus(state, 22) * lavaLog(stardust)) / 100;
  const accuracyChain =
    getLocalCompassBonus(state, 120) +
    getLocalCompassBonus(state, 124) +
    getLocalCompassBonus(state, 125) +
    getLocalCompassBonus(state, 128) +
    getLocalCompassBonus(state, 131) +
    getLocalCompassBonus(state, 133) +
    getLocalCompassBonus(state, 134) +
    getLocalCompassBonus(state, 136) +
    getLocalCompassBonus(state, 147) +
    getLocalCompassBonus(state, 84) * lavaLog(hp) +
    getLocalCompassBonus(state, 79) +
    getLocalCompassBonus(state, 90);
  const accuracy = accuracyBase * accuracyMul1 * (1 + accuracyChain / 100);

  // Defence. Dropped: defenceAndAccTalent, equipBonus.
  const defenceBase =
    1 + getLocalCompassBonus(state, 29) + getLocalCompassBonus(state, 63);
  const defenceMul1 =
    1 + (getLocalCompassBonus(state, 30) * lavaLog(moondust)) / 100;
  const defenceChain =
    getLocalCompassBonus(state, 137) +
    getLocalCompassBonus(state, 138) +
    getLocalCompassBonus(state, 141) +
    getLocalCompassBonus(state, 143) +
    getLocalCompassBonus(state, 144) +
    getLocalCompassBonus(state, 149) +
    getLocalCompassBonus(state, 83) +
    getLocalCompassBonus(state, 91);
  const defence = defenceBase * defenceMul1 * (1 + defenceChain / 100);

  // Crit %. critTalent, breeding dropped.
  const critPct =
    5 + getLocalCompassBonus(state, 16) + getLocalCompassBonus(state, 66);

  // Crit damage. equipBonus2 dropped.
  const critDamage =
    1 +
    (20 +
      (getLocalCompassBonus(state, 20) + getLocalCompassBonus(state, 123)) +
      getLocalCompassBonus(state, 75)) /
      100;

  // Attack speed. equipBonus3 dropped.
  const attackSpeed =
    getLocalCompassBonus(state, 21) + getLocalCompassBonus(state, 69);

  // Mastery (not currently surfaced in any UPGRADE_CATEGORIES entry;
  // populated for completeness).
  const mastery = Math.min(0.7, 0.2 + getLocalCompassBonus(state, 70) / 100);

  // Multi shop %. multiTalent dropped.
  const multi =
    getLocalCompassBonus(state, 18) +
    (getLocalCompassBonus(state, 125) + getLocalCompassBonus(state, 73));

  return {
    hp,
    damage,
    accuracy,
    defence,
    critPct,
    critDamage,
    attackSpeed,
    mastery,
    multi,
  };
}

// Verbatim port of the game's extra dust multiplier. External bonuses
// (charm, equip, emperor, dustTalent, compassTalent, arcadeBonus) are absent
// in CompassData; treated as 0 for phase 1. lavaLog is over solardust
// (the game's accountOptions[359] = state.dusts[2]).
export function getExtraDustMultiplier(state: CompassData): number {
  return (
    (1 +
      (getLocalCompassBonus(state, 31) +
        getLocalCompassBonus(state, 34) * lavaLog(state.dusts[2])) /
        100) *
    (1 + getLocalCompassBonus(state, 38) / 100) *
    (1 +
      (getLocalCompassBonus(state, 139) +
        (getLocalCompassBonus(state, 142) +
          (getLocalCompassBonus(state, 145) +
            (getLocalCompassBonus(state, 148) +
              (getLocalCompassBonus(state, 150) +
                (getLocalCompassBonus(state, 68) +
                  (getLocalCompassBonus(state, 93) +
                    getLocalCompassBonus(state, 89)))))))) /
        100)
  );
}
