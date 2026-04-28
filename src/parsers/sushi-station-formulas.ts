// ---------------------------------------------------------------------------
// Data tables
// ---------------------------------------------------------------------------

// Each entry: [name, maxLv, costBase, bonusPerLv, costDN, description]
// Indices used by formulas: [1] maxLv, [2] costBase, [3] bonusPerLv, [4] costDN
export const SUSHI_UPG: readonly (readonly [
  string,
  number,
  number,
  number,
  number,
  string,
])[] = [
  ["Sushi Slot", 50, 3.5, 1, 0, "Adds a new slot for your Sushi Station!"],
  ["Fuel Capacity I", 9999, 1.08, 50, 0, "+{ max Fuel Capacity!"],
  [
    "Fuel Capacity II",
    9999,
    1.1,
    200,
    0,
    "+{ max Fuel Capacity, and a unique @ $x Fuel Cap bonus!",
  ],
  [
    "Fuel Capacity III",
    9999,
    1.12,
    1500,
    0,
    "+{ max Fuel Capacity, and a unique @ $x Fuel Cap bonus!",
  ],
  [
    "Fuel Capacity IV",
    9999,
    1.13,
    10_000,
    0,
    "+{ max Fuel Capacity, and a unique @ $x Fuel Cap bonus!",
  ],
  [
    "Fuel Capacity V",
    9999,
    1.15,
    50_000,
    0,
    "+{ max Fuel Capacity, and a unique @ $x Fuel Cap bonus!",
  ],
  [
    "Superior Sushi Skillz",
    35,
    3.8,
    1,
    0.2,
    "You can now click the Sushi on your fuel bar to change which sushi you cook, up to Tier $. This also increases fuel cost.",
  ],
  [
    "Quality Freshness",
    25,
    6.5,
    1,
    0,
    "{% chance for freshly cooked Sushi to be +1 higher Tier! Cook T1, get T2!",
  ],
  [
    "Fastburn Fuel I",
    9999,
    1.1,
    15,
    0,
    "+{% faster Fuel generation! @ Your current rate is $",
  ],
  [
    "Fastburn Fuel II",
    9999,
    1.12,
    100,
    0,
    "+{% faster Fuel generation, and a unique @ $x Fuel Generation multi bonus!",
  ],
  [
    "Fastburn Fuel III",
    9999,
    1.14,
    750,
    0,
    "+{% faster Fuel generation, and a unique @ $x Fuel Generation multi bonus!",
  ],
  [
    "Fastburn Fuel IV",
    9999,
    1.16,
    5000,
    0,
    "+{% faster Fuel generation, and a unique @ $x Fuel Generation multi bonus!",
  ],
  [
    "Fastburn Fuel V",
    9999,
    1.17,
    25_000,
    0,
    "+{% faster Fuel generation, and a unique @ $x Fuel Generation multi bonus!",
  ],
  [
    "Seared Knowledge",
    1,
    1.1,
    1,
    1.5,
    "Whenever a sushi is created in any way, that sushi type gains +1 EXP. Level up sushi for unique knowledge bonuses!",
  ],
  [
    "Hot Slot",
    20,
    20.0,
    1,
    0,
    "Adds a new SPECIAL slot for your Sushi Station... the Hot Plate! Sushi on these slots generate $x more Bucks!",
  ],
  [
    "Cold Slot",
    8,
    150,
    1,
    0,
    "Adds a new SPECIAL slot for your Sushi Station... the Cold Plate! Sushi on these slots generate +$ EXP/day for ALL sushi lower tiered than this one!",
  ],
  [
    "Milktoast Slot",
    12,
    70.0,
    1,
    0,
    "Adds a new SPECIAL slot for your Sushi Station... the Milktoast Plate! Sushi on these slots generate +$ EXP/day",
  ],
  [
    "Salt Shaker",
    1,
    1.1,
    1,
    2,
    "Click to use once per day. When used, all sushi have a chance of getting a Tier Up! By default, you get +1 shaker use every day, just sayin'.",
  ],
  [
    "Pepper Shaker",
    1,
    1.1,
    1,
    3,
    "Click to use once per day. When used, all sushi have a chance to be Perfecto'd, which means its Knowledge Bonus is 2x bigger!",
  ],
  [
    "Saffron Shaker",
    1,
    1.1,
    1,
    4,
    "Click to use once per day. When used, all sushi generate 1 hour's worth of Bucks!",
  ],
  [
    "Shake N' Bake",
    10,
    100.0,
    1,
    0,
    "Whenever you use any Shaker, you instantly generate 1 hour's worth of Fuel! Also, {% chance to get 10 hour's worth instead!",
  ],
  [
    "Bottomless Shakers",
    20,
    12.0,
    1,
    0,
    "Whenever you use any Shaker, there's a {% chance to get another usage! Free use, basically...",
  ],
  [
    "Sasaphrax Saffron",
    23,
    11.0,
    1,
    0,
    "Saffron Shaker now generates $ hour's worth of Bucks, not just 1 hour!",
  ],
  [
    "Charcoal Fireplace",
    15,
    40.0,
    1,
    0,
    "Unlock a new Fireplace! This default red charcoal fire increases Fuel generation by +1% per Tier of Sushi in the column above it.",
  ],
  [
    "Copper Firelighter",
    1,
    1.1,
    1,
    3,
    "Fireplaces can be changed to blue. Sushi above blue fires have a {% chance of getting +2 tiers instead of +1, so long as it's not your highest tier.",
  ],
  [
    "Potassium Firelighter",
    1,
    1.1,
    1,
    5,
    "Fireplaces can be changed to purple, which each give +1/sec @ $",
  ],
  [
    "Lithium Firelighter",
    1,
    1.1,
    1,
    4,
    "Fireplaces can be changed to pink. Sushi above pink fires generate $x more Knowledge EXP by all methods and means of doing so! Think about it.",
  ],
  [
    "Barium Firelighter",
    1,
    1.1,
    1,
    2,
    "Fireplaces can be changed to green. Sushi above green fires generate $x more Bucks.",
  ],
  [
    "Overtuned Fuel",
    1,
    1.1,
    1,
    0,
    "When you generate fuel while at max capacity, you get +1 @ $",
  ],
  [
    "Heat of the East Wind",
    1,
    1.1,
    1,
    0,
    "When a sushi is combined, it tiers-up the sushi to its right, but only if that sushi is lower tiered. @ This only works on sushi Tier $ and lower.",
  ],
  [
    "Customer Surcharge I",
    9999,
    1.14,
    2,
    0,
    "All your sushi generate Bucks based on their tier. Higher tier sushi generate way more! @ This upgrade boosts all Bucks generated by +{%",
  ],
  [
    "Customer Surcharge II",
    9999,
    1.16,
    3,
    0,
    "All your sushi generate +{% more Bucks! Also, each unique sushi you create gives a 1.10x multiplicative bonus to Bucks generated, did you know that?",
  ],
  [
    "Customer Surcharge III",
    9999,
    1.17,
    5,
    0,
    "All your sushi generate +{% more Bucks!",
  ],
  [
    "Customer Surcharge IV",
    9999,
    1.19,
    10,
    0,
    "All your sushi generate +{% more Bucks!",
  ],
  [
    "Customer Surcharge V",
    9999,
    1.2,
    20,
    0,
    "All your sushi generate +{% more Bucks!",
  ],
  [
    "Quickpay Fee",
    120,
    2.0,
    1,
    0,
    "When a sushi is created, it instantly generates { minute's worth of Bucks!",
  ],
  [
    "Wholesale Pricing",
    9999,
    1.15,
    1,
    0,
    "All upgrades are $% cheaper, now and forever!",
  ],
  [
    "2nd Degree Searing",
    9999,
    1.35,
    1,
    0,
    "Newly created Sushi generate +$ exp, instead of just +1 EXP. This is of course multiplied by all knowledge EXP multi's",
  ],
  [
    "3rd Degree Searing",
    9999,
    1.15,
    1,
    0,
    "Boosts all Sushi EXP gained from all sources by +{% . That includes newly created Sushi and EXP from Cold and Milktoast plates.",
  ],
  [
    "Rift Guy's Upgrade",
    0,
    1.1,
    1,
    0,
    "I've got my hands in everything! Minehead, farming, the rift... so yea, of course I'm in the Sushi biz too, don't be so shocked.",
  ],
  ["No Tax on Tips", 9999, 1.2, 2, 0, "Multiplies all Bucks earned by }x"],
  [
    "Hourly Wage Meter",
    9999,
    1.08,
    1,
    0,
    "Adds a display to the Top Right of the Sushi Station which shows total Hourly Bucks generated by all your sushi. @ Also, +{% total Bucks generated by all sushi!",
  ],
  [
    "Movement Mittens",
    1,
    1.1,
    1,
    0.3,
    "Adds the MOVE button. Enabling this option lets you drag the SLOTS themselves around your Sushi Station, instead of the sushi.",
  ],
  [
    "Sushi Tier Vision",
    9999,
    1.2,
    2,
    0,
    "Adds a toggle button to the Top Left of the Sushi Station. Click it to show Sushi Tiers numerically, can be turned off any time. @ Also, +{% total Bucks generated by all sushi!",
  ],
  [
    "Sushi Service Bonuses",
    1,
    1.1,
    1,
    0,
    "Creating a new sushi type gives a new IdleOn bonus for the REST of the game! Check them out in the BONUS tap, top right corner.",
  ],
] as const;

// slot -> SUSHI_UPG index. Only 32 entries; _computePath iterates slot < SLOT_TO_UPG.length.
export const SLOT_TO_UPG: readonly number[] = [
  20, 3, 19, 16, 21, 17, 1, 12, 14, 26, 8, 2, 13, 9, 28, 5, 15, 10, 7, 24, 0, 6,
  18, 4, 22, 11, 23, 25, 27, 29, 30, 31,
] as const;

// Maps sushi tier (0..31) to knowledge category index (0..10).
// Only 32 entries; tiers 32..53 have cat === undefined -> knowledgeBonusSpecific returns 0.
export const TIER_TO_KNOWLEDGE_CAT: readonly number[] = [
  0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 3, 4, 3,
] as const;

// Base value per knowledge category (11 entries).
export const KNOWLEDGE_CAT_VALUE: readonly number[] = [
  20, 2, 0.1, 10, 3, 0.05, 1, 2, 0.2, 0.2, 100,
] as const;

// Ring of Glory bonus values indexed by uniqueSushi position (54 entries used by sushi formulas).
export const ROG_BONUS_QTY: readonly number[] = [
  100, 30, 2, 2, 2, 1, 30, 30, 1, 30, 100, 25, 50, 1, 20, 25, 50, 1, 20, 1, 200,
  3, 1, 1, 2, 30, 25, 50, 100, 100, 1, 50, 100, 3, 50, 100, 1, 40, 25, 100, 1,
  100, 20, 50, 50, 25, 30, 50, 10, 10, 10, 10, 50, 1, 1, 25, 2, 30, 10,
] as const;

// Bucks generated per tier for tiers 0..9 (tiers >= 10 use a formula).
export const CURRENCY_PER_TIER: readonly number[] = [
  1, 3, 8, 20, 50, 115, 250, 560, 1220, 2650,
] as const;

export const MAX_SLOTS = 120;
export const MAX_TIER = 53;

// ---------------------------------------------------------------------------
// Leaf helper functions (no dependencies on later-task functions)
// ---------------------------------------------------------------------------

// Game's truncated log10 helper (formulas.js:57-59).
export function getLOG(x: number): number {
  // biome-ignore lint/suspicious/noApproximativeNumericConstant: deliberate truncated constant from reference source
  return Math.log(Math.max(x, 1)) / 2.302_59;
}

// Returns the total bonus quantity provided by upgrade at upgIdx given current levels (sushi.js:84-87).
export function upgradeQTY(
  upgIdx: number,
  upgLevels: readonly number[]
): number {
  const lv = Number(upgLevels[upgIdx]) || 0;
  return (SUSHI_UPG[upgIdx]?.[3] || 0) * lv;
}

// Returns the SUSHI_UPG index for a given slot (sushi.js:92-94).
export function slotUpgIdx(slot: number): number {
  return SLOT_TO_UPG[slot] as number;
}

// Returns the research level required to unlock the given slot (sushi.js:74-78).
export function upgLvReq(t: number): number {
  return Math.floor(
    1 +
      Math.min(2, t) +
      Math.min(4, t) +
      (3 * t -
        Math.max(0, t - 4) -
        Math.max(0, t - 8) +
        Math.floor(t / 6) +
        Math.floor(t / 17))
  );
}

// Returns bucks generated per hour for a single tier (sushi.js:57-61).
export function currencyPerTier(tier: number): number {
  if (tier < 10) {
    return CURRENCY_PER_TIER[tier] || 0;
  }
  if (tier < 16) {
    return (2.46 - tier / 100) ** tier + 5 * tier + tier ** 2;
  }
  return 2.31 ** tier;
}

// Returns fuel cost for unlocking a tier (sushi.js:63-66).
export function fuelCostPerTier(tier: number): number {
  if (tier === 5) {
    return 176;
  }
  return 10 * 1.83 ** tier - tier ** 2;
}

// Returns Ring of Glory bonus for position idx when uniqueSushi threshold is met (sushi.js:18-21).
export function rogBonusQTY(idx: number, uniqueSushi: number): number {
  if (uniqueSushi > idx) {
    return ROG_BONUS_QTY[idx] || 0;
  }
  return 0;
}

// Builds a per-position array of ROG bonuses based on current uniqueSushi count (sushi.js:24-28).
export function buildRogArray(uniqueSushi: number): number[] {
  const arr = new Array<number>(ROG_BONUS_QTY.length);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = uniqueSushi > i ? ROG_BONUS_QTY[i] || 0 : 0;
  }
  return arr;
}
