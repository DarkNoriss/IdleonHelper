import {
  type AlchemyData,
  BUBBLES_PER_CAULDRON,
  CAULDRON_FLAT_OFFSET,
  CAULDRON_ORDER,
  type Cauldron,
} from "@/types/alchemy";

const PRISMA_FRAGMENTS_INDEX = 383;
const PRISMA_BUBBLES_INDEX = 384;

// ---------------------------------------------------------------------------
// Prisma multiplier source helpers
// Each returns { value: number; present: boolean }.
// present = false only when the required save field is missing/unparseable.
// present = true with value = 0 means the feature exists but contributes 0.
// ---------------------------------------------------------------------------

type SourceResult = { value: number; present: boolean };

// Tesseract upgrade 45 "Pinnacle of Prisma": level * x5 (x5 = 1).
// Index 45 is in the simple-multiply group (no recursive modifier).
// Raw save key: Arcane (parsed as number[]).
function getTesseractPrismaBonus(root: Record<string, unknown>): SourceResult {
  const arcane = parseArrayValue(root.Arcane);
  if (!Array.isArray(arcane)) {
    return { value: 0, present: false };
  }
  const level = toNumber(arcane[45]);
  return { value: level, present: true };
}

// Arcade shop index 54 "+{% Prisma Bonuses": growth('decay', level, 10, 100).
// decay formula: (x1 * level) / (level + x2) = (10 * level) / (level + 100).
// Result is a percentage (e.g. level=100 -> 5%).
// Raw save key: ArcadeUpg (parsed as number[]).
function getArcadePrismaBonus(root: Record<string, unknown>): SourceResult {
  const arcadeUpg = parseArrayValue(root.ArcadeUpg);
  if (!Array.isArray(arcadeUpg)) {
    return { value: 0, present: false };
  }
  const level = toNumber(arcadeUpg[54]);
  const bonus = (10 * level) / (level + 100);
  return { value: bonus, present: true };
}

// Sushi ROG bonus index 23.
// getSushiBonus returns researchData[37][23] = 1 if uniqueSushi > 23, else 0.
// uniqueSushi = highest consecutive sushi tier with tracking value >= 0.
// Raw save key: Sushi (2-D array); Sushi[5] = uniqueSushiTracking.
const SUSHI_ROG_BONUS_23 = 1; // research[37][23] from IdleonToolbox website-data.json
const SUSHI_MAX_TIER = 58;

function getSushiPrismaBonus(root: Record<string, unknown>): SourceResult {
  const sushiRaw = parseArrayValue(root.Sushi);
  if (!Array.isArray(sushiRaw)) {
    return { value: 0, present: false };
  }
  const uniqueSushiTracking = parseArrayValue(sushiRaw[5]);
  if (!Array.isArray(uniqueSushiTracking)) {
    return { value: 0, present: false };
  }
  let uniqueSushi = 0;
  for (let i = 0; i <= SUSHI_MAX_TIER; i++) {
    if ((uniqueSushiTracking[i] ?? -1) >= 0) {
      uniqueSushi = i + 1;
    } else {
      break;
    }
  }
  const bonus = uniqueSushi > 23 ? SUSHI_ROG_BONUS_23 : 0;
  return { value: bonus, present: true };
}

// Trophy23: +10% when Trophy23 has been looted (is in the slab/looty list).
// Raw save key: Cards (array where [1] is lootyRaw) or Cards1 (JSON string).
function getTrophyPrismaBonus(root: Record<string, unknown>): SourceResult {
  const cardsArr = parseArrayValue(root.Cards);
  let lootyRaw: unknown;
  if (Array.isArray(cardsArr)) {
    lootyRaw = cardsArr[1];
  } else {
    lootyRaw = parseArrayValue(root.Cards1);
  }
  if (!Array.isArray(lootyRaw)) {
    return { value: 0, present: false };
  }
  const bonus = (lootyRaw as unknown[]).includes("Trophy23") ? 10 : 0;
  return { value: bonus, present: true };
}

// Gaming Palette index 28 "+#% higher Prisma Bubble bonus".
// Formula (paletteType === 1): bonus = (level / (level + 25)) * x4 * paletteGlobalMulti
// where x4 = 6, paletteGlobalMulti = (1 + legendBonus10/100) * (1 + 0.5 * bossDefeated8).
// legendBonus10 = 25 * Spelunk[18][10] (legend talent 10, x2 = 25).
// bossDefeated8 = Spelunk[0][8] > 0.
// No superbit doubling applies to palette index 28 (map covers 25,13,31,18,3,12).
// Raw save key: Spelunk (parsed as 2-D array).
function getPalettePrismaBonus(root: Record<string, unknown>): SourceResult {
  const spelunkRaw = parseArrayValue(root.Spelunk);
  if (!Array.isArray(spelunkRaw)) {
    return { value: 0, present: false };
  }
  const palette9 = parseArrayValue(spelunkRaw[9]);
  if (!Array.isArray(palette9)) {
    return { value: 0, present: false };
  }
  const spelunkValue = toNumber(palette9[28]);

  const legendTalentsRaw = parseArrayValue(spelunkRaw[18]);
  const legendLevel10 = Array.isArray(legendTalentsRaw)
    ? toNumber(legendTalentsRaw[10])
    : 0;
  const legendBonus10 = 25 * legendLevel10;

  const bosses0 = parseArrayValue(spelunkRaw[0]);
  const bossDefeated8 = Array.isArray(bosses0)
    ? toNumber(bosses0[8]) > 0
    : false;

  const paletteGlobalMulti =
    (1 + legendBonus10 / 100) * (1 + 0.5 * (bossDefeated8 ? 1 : 0));
  const bonus = (spelunkValue / (spelunkValue + 25)) * 6 * paletteGlobalMulti;
  return { value: bonus, present: true };
}

// Ethereal Sigils: 0.2% per active ethereal (or eclectic) sigil.
// CauldronP2W[4] is a flat [progress, unlocked, progress, unlocked, ...] array.
// unlocked === 3 -> ethereal, unlocked === 4 -> eclectic (both count).
// Raw save key: CauldronP2W.
function getEtherealSigilsBonus(root: Record<string, unknown>): SourceResult {
  const cauldronP2W = parseArrayValue(root.CauldronP2W);
  if (!Array.isArray(cauldronP2W)) {
    return { value: 0, present: false };
  }
  const sigilsData = parseArrayValue(cauldronP2W[4]);
  if (!Array.isArray(sigilsData)) {
    return { value: 0, present: false };
  }
  let count = 0;
  for (let i = 1; i < sigilsData.length; i += 2) {
    const unlocked = toNumber(sigilsData[i]);
    if (unlocked === 3 || unlocked === 4) {
      count++;
    }
  }
  return { value: 0.2 * count, present: true };
}

// Exotic Market index 48 "PRISMA_PETAL": +{% Prisma Bubble Bonus (type === 1).
// Formula: baseValue * (level / (1000 + level)) where baseValue = 2.
// level stored at FarmUpg[20 + 48] = FarmUpg[68].
// Raw save key: FarmUpg.
const EXOTIC_MARKET_48_BASE = 2;

function getExoticMarketBonus(root: Record<string, unknown>): SourceResult {
  const farmUpg = parseArrayValue(root.FarmUpg);
  if (!Array.isArray(farmUpg)) {
    return { value: 0, present: false };
  }
  const level = toNumber(farmUpg[68]);
  const bonus = EXOTIC_MARKET_48_BASE * (level / (1000 + level));
  return { value: bonus, present: true };
}

// Legend Talent 36 "Wowa Woowa": +{% higher Prisma and Exalted bonuses.
// bonus = x2 * level = 3 * level.
// legendTalentsRaw = Spelunk[18].
// Raw save key: Spelunk.
function getLegendTalentPrismaBonus(
  root: Record<string, unknown>
): SourceResult {
  const spelunkRaw = parseArrayValue(root.Spelunk);
  if (!Array.isArray(spelunkRaw)) {
    return { value: 0, present: false };
  }
  const legendTalentsRaw = parseArrayValue(spelunkRaw[18]);
  if (!Array.isArray(legendTalentsRaw)) {
    return { value: 0, present: false };
  }
  const level = toNumber(legendTalentsRaw[36]);
  return { value: 3 * level, present: true };
}

// Companion 88 "Rift Hivemind": +50% Prisma Bubble bonus multi when acquired.
// Companion data lives in Firebase _comp/{uid}, a separate document NOT present
// in the main save JSON. This parser only receives the main save JSON (root),
// so the companion cannot be checked here.
// LIMITATION: companion 88 active state is unavailable from root save data.
// Always returns { value: 0, present: false }.
function getCompanionPrismaBonus(_root: Record<string, unknown>): SourceResult {
  return { value: 0, present: false };
}

// ---------------------------------------------------------------------------
// Main computation
// ---------------------------------------------------------------------------

const PRISMA_BASE = 2;
const PRISMA_CAP = 4;

function computePrismaMultiplier(
  root: Record<string, unknown>
): AlchemyData["prismaMultiplier"] {
  const sources = {
    tesseract: getTesseractPrismaBonus(root),
    arcade: getArcadePrismaBonus(root),
    sushi: getSushiPrismaBonus(root),
    trophy: getTrophyPrismaBonus(root),
    palette: getPalettePrismaBonus(root),
    etherealSigils: getEtherealSigilsBonus(root),
    exoticMarket: getExoticMarketBonus(root),
    legendTalent: getLegendTalentPrismaBonus(root),
    companion: getCompanionPrismaBonus(root),
  } as const;

  const total = Object.values(sources).reduce((acc, s) => acc + s.value, 0);
  const value = Math.min(PRISMA_CAP, PRISMA_BASE + total / 100);

  const missing: string[] = [];
  for (const [name, result] of Object.entries(sources)) {
    if (!result.present) {
      missing.push(name);
    }
  }

  return {
    value,
    breakdown: {
      tesseract: sources.tesseract.value,
      arcade: sources.arcade.value,
      sushi: sources.sushi.value,
      trophy: sources.trophy.value,
      palette: sources.palette.value,
      etherealSigils: sources.etherealSigils.value,
      exoticMarket: sources.exoticMarket.value,
      legendTalent: sources.legendTalent.value,
      companion: sources.companion.value,
    },
    missing,
  };
}

export function parseAlchemy(parsedJson: unknown): AlchemyData | null {
  if (!parsedJson || typeof parsedJson !== "object") {
    return null;
  }

  const candidate = parsedJson as Record<string, unknown>;
  const dataCandidate = candidate.data;
  const root: Record<string, unknown> =
    dataCandidate &&
    typeof dataCandidate === "object" &&
    !Array.isArray(dataCandidate)
      ? (dataCandidate as Record<string, unknown>)
      : candidate;

  const accountOptions = parseArrayValue(root.OptLacc);
  if (!Array.isArray(accountOptions)) {
    return null;
  }

  const prismaFragments = toNumber(accountOptions[PRISMA_FRAGMENTS_INDEX]);
  const prismaticBubbleFlatIndices = parsePrismaticCsv(
    accountOptions[PRISMA_BUBBLES_INDEX]
  );
  const bubbleLevels = parseBubbleLevels(root.CauldronInfo);

  return {
    prismaFragments,
    prismaticBubbleFlatIndices,
    bubbleLevels,
    prismaMultiplier: computePrismaMultiplier(root),
  };
}

function parsePrismaticCsv(raw: unknown): ReadonlySet<number> {
  if (typeof raw !== "string") {
    return new Set();
  }
  // Save format: "0,1,5," (trailing comma is intentional).
  const parts = raw.split(",");
  const out = new Set<number>();
  for (const part of parts) {
    if (part.length === 0) {
      continue;
    }
    const n = Number(part);
    if (Number.isFinite(n)) {
      out.add(n);
    }
  }
  return out;
}

function parseBubbleLevels(raw: unknown): number[][] {
  const arr = parseArrayValue(raw);
  if (!Array.isArray(arr)) {
    return CAULDRON_ORDER.map(() => emptyCauldronLevels());
  }
  return CAULDRON_ORDER.map((_, idx) => {
    const row = arr[idx];
    if (!Array.isArray(row)) {
      return emptyCauldronLevels();
    }
    const out: number[] = [];
    for (let i = 0; i < BUBBLES_PER_CAULDRON; i++) {
      out.push(toNumber(row[i]));
    }
    return out;
  });
}

function emptyCauldronLevels(): number[] {
  return Array.from({ length: BUBBLES_PER_CAULDRON }, () => 0);
}

function parseArrayValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

function toNumber(value: unknown): number {
  return Number(value ?? 0) || 0;
}

// Re-exported for the page so it can map (cauldron, idx) to flat index without
// importing constants in two places.
export function getFlatIndex(
  cauldron: Cauldron,
  indexInCauldron: number
): number {
  return CAULDRON_FLAT_OFFSET[cauldron] + indexInCauldron;
}
