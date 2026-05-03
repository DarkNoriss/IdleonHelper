import type {
  CompanionRawData,
  IdleonRawData,
  RawJson,
} from "@/types/raw-json";
import type { SushiStationData } from "@/types/sushi-station";
import { isCompanionAcquired } from "./companions";
import { computeGridAllMulti, readGridBonus } from "./research-grid";
import {
  computeUniqueSushi,
  type ExternalSources,
  knowledgeBonusTotals,
  rogBonusQTY,
  SUSHI_UPG,
} from "./sushi-station-formulas";

export function parseSushiStation(
  parsedJson: unknown
): SushiStationData | null {
  if (!parsedJson || typeof parsedJson !== "object") {
    return null;
  }

  // Raw JSON may be wrapped (`{ data: {...}, companion: {...} }`) or flat
  // (legacy callers/tests). Mirror the getData() pattern from
  // construction.ts / boss-farmer.ts.
  const candidate = parsedJson as Partial<RawJson> & Record<string, unknown>;
  const dataCandidate = candidate.data;
  const root: IdleonRawData =
    dataCandidate &&
    typeof dataCandidate === "object" &&
    !Array.isArray(dataCandidate)
      ? (dataCandidate as IdleonRawData)
      : (candidate as IdleonRawData);
  const companion: CompanionRawData | null =
    candidate.companion && typeof candidate.companion === "object"
      ? (candidate.companion as CompanionRawData)
      : null;

  const sushi = parseArrayValue(root.Sushi);
  if (!Array.isArray(sushi)) {
    return null;
  }

  const ulRaw = sushi[2];
  if (!Array.isArray(ulRaw)) {
    return null;
  }
  const upgradeLevels: number[] = SUSHI_UPG.map(
    (_, i) => Number(ulRaw[i] ?? 0) || 0
  );

  const meta = sushi[4];
  const bucks = Array.isArray(meta) ? Number(meta[3] ?? 0) || 0 : 0;
  const sparks = Array.isArray(meta) ? Number(meta[2] ?? 0) || 0 : 0;
  const fuelCurrent = Array.isArray(meta) ? Number(meta[0] ?? 0) || 0 : 0;

  // Account-wide research level = max of `Lv0_<i>[20]` across all 10 chars.
  let researchLevel = 0;
  for (let i = 0; i < 10; i++) {
    const lv0 = parseArrayValue(root[`Lv0_${i}`]);
    if (Array.isArray(lv0)) {
      researchLevel = Math.max(researchLevel, Number(lv0[20] ?? 0) || 0);
    }
  }

  const bundlesRaw = parsePassthrough(root.BundlesReceived);
  const hasBundleV = Boolean(
    bundlesRaw &&
      typeof bundlesRaw === "object" &&
      !Array.isArray(bundlesRaw) &&
      (bundlesRaw as Record<string, unknown>).bon_v
  );

  const rawSushiData: unknown = sushi;
  const knowledgeTotals = knowledgeBonusTotals(rawSushiData);
  const knowledgeCat6Total = Number(knowledgeTotals[6] ?? 0) || 0;
  const uniqueSushi = computeUniqueSushi(rawSushiData);
  const rogBonus26 = rogBonusQTY(26, uniqueSushi);

  // Each external bonus mirrors toolbox's parser scoped to just what the
  // sushi currency-multi formula needs. Companion bonuses come from
  // `_comp/{uid}` (Realtime Database) -- see `cloudsave-subscription.ts`.
  const hasCompanion27 = isCompanionAcquired(companion, 27);
  const hasCompanion147 = isCompanionAcquired(companion, 147);
  // `extraAdditive = 1` iff `uniqueSushi > 53` -- this is the rog bonus
  // `research[37][53]` (sushiBonus53 in toolbox), which adds to gridAllMulti.
  const gridAllMulti = computeGridAllMulti(
    root,
    companion,
    uniqueSushi > 53 ? 1 : 0
  );
  const externalSources: ExternalSources = {
    hasBundleV,
    atom14: readAtomBonus14(root),
    sailing39: readSailing39(root),
    arcade67: readArcade67(root, hasCompanion27),
    gridBonus189: readGridBonus(root, 189, 25, gridAllMulti),
    mineheadBonus11: readMineheadBonus11(root),
    gamingSuperBit67: readGamingSuperBit67(root),
    buttonBonus2: readButtonBonus2(root, hasCompanion147, gridAllMulti),
    eventShopBonus45: readEventShopBonus45(root),
  };

  return {
    upgradeLevels,
    bucks,
    researchLevel,
    knowledgeCat6Total,
    rogBonus26,
    rawSushiData,
    hasBundleV,
    sparks,
    fuelCurrent,
    externalSources,
  };
}

// Parses a value that may be a JSON string or an already-parsed array.
// Mirrors the inline pattern from construction.ts / boss-farmer.ts.
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

// Parses a value that may be a JSON string or already-parsed object/array.
// Used for non-array values like BundlesReceived (plain object).
function parsePassthrough(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

// ---------------------------------------------------------------------------
// External bonus extractors -- inline ports of the corresponding toolbox
// parsers, scoped to just the fields the sushi station needs.
// ---------------------------------------------------------------------------

// `number2letter` table: each index maps to the character used in concatenated
// unlock strings. `OptLacc[311]` (event shop flags) and `Gaming[12]` (superbit
// unlocks) both use this encoding.
const NUMBER_TO_LETTER = [
  "_",
  ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  "肥",
  "肢",
  "肖",
  "肋",
  "肉",
  "職",
  "耐",
  "者",
  "箱",
  "管",
  "算",
  "箔",
  "策",
  "答",
  "筒",
  "筍",
  "白",
  "発",
  "癒",
  "痛",
  "痕",
  "病",
  "疾",
  "疲",
  "潤",
  "潜",
  "漬",
  "漠",
  "演",
  "漏",
  "漁",
  "滞",
  "毎",
  "殻",
  "殺",
  "段",
  "殖",
  "残",
  "歳",
  "歯",
  "歩",
  "武",
  "歓",
  "欲",
  "次",
  "欠",
  "櫛",
  "機",
  "色",
  "村",
  "材",
  "杉",
  "本",
  "末",
  "未",
  "木",
];

function letterAt(index: number): string {
  return NUMBER_TO_LETTER[index] ?? "";
}

// Atom 14 (Phosphorus_-_Sushi_Bucks_Generator). atomsInfo[14].baseBonus = 1.
// Bonus = level. Source: toolbox parsers/world-3/atomCollider.ts.
function readAtomBonus14(root: IdleonRawData): number {
  const atoms = parseArrayValue(root.Atoms);
  return Array.isArray(atoms) ? Number(atoms[14] ?? 0) || 0 : 0;
}

// Sailing artifact 39 acquired tier (0..6). The currency-multi factor scales
// linearly: tier 1 -> 2x, tier 6 -> 7x. Source: toolbox world-5/sailing.ts.
function readSailing39(root: IdleonRawData): number {
  const sailing = parseArrayValue(root.Sailing);
  if (!Array.isArray(sailing)) {
    return 0;
  }
  const acquired = sailing[3];
  return Array.isArray(acquired) ? Number(acquired[39] ?? 0) || 0 : 0;
}

// Arcade upgrade 67 (Sushi_Bucks). arcadeShop[67] = {x1:25, x2:100, func:"decay"}.
// `growth("decay", lv, 25, 100) = 25*lv/(lv+100)`. Multiplied by `2` if level
// > 100 (super bonus) and `2` again if companion 27 (Spirit Reindeer) acquired.
// Source: toolbox parsers/world-2/arcade.ts.
function readArcade67(root: IdleonRawData, hasCompanion27: boolean): number {
  const arcade = parseArrayValue(root.ArcadeUpg);
  if (!Array.isArray(arcade)) {
    return 0;
  }
  const level = Number(arcade[67] ?? 0) || 0;
  if (level <= 0) {
    return 0;
  }
  const baseBonus = (25 * level) / (level + 100);
  const superBonus = level > 100 ? 2 : 1;
  const companionBonus = hasCompanion27 ? 2 : 1;
  return baseBonus * superBonus * companionBonus;
}

// Minehead opponent 11 reward. `researchData[20][11] = 25`, gated on
// opponentsBeat (`Research[7][4]`) > 11. The sushi formula clamps the resulting
// factor to [1x, 1.25x] so this is effectively binary.
// Source: toolbox parsers/world-7/minehead.ts.
function readMineheadBonus11(root: IdleonRawData): number {
  const research = parseArrayValue(root.Research);
  if (!Array.isArray(research)) {
    return 0;
  }
  const mineState = research[7];
  if (!Array.isArray(mineState)) {
    return 0;
  }
  const opponentsBeat = Number(mineState[4] ?? 0) || 0;
  return opponentsBeat > 11 ? 25 : 0;
}

// Gaming superbit 67 (Small_Gratuity) unlock flag. Stored as a concatenated
// string of `number2letter` markers in Gaming[12]; superbit n is unlocked iff
// `number2letter[n]` is in it.
// Source: toolbox parsers/world-5/gaming.ts.
function readGamingSuperBit67(root: IdleonRawData): number {
  const gaming = parseArrayValue(root.Gaming);
  if (!Array.isArray(gaming)) {
    return 0;
  }
  const sbStr = String(gaming[12] ?? "");
  const marker = letterAt(67);
  return marker !== "" && sbStr.includes(marker) ? 1 : 0;
}

// Button bonus index 2 (Sushi). `bonusPerPress[2] = 2`. Press cycle is 9
// categories of 5 presses each (45-block); category 2 occupies presses 10..14
// of every block. Per-press multi compounds companion 147 (+50%) with grid 125
// ("Better Button", +5% per lv, max lv 3, all-multi compounds).
// Source: toolbox parsers/world-7/button.ts.
function readButtonBonus2(
  root: IdleonRawData,
  hasCompanion147: boolean,
  gridAllMulti: number
): number {
  const opt = parseArrayValue(root.OptLacc);
  if (!Array.isArray(opt)) {
    return 0;
  }
  const totalPresses = Number(opt[594] ?? 0) || 0;
  if (totalPresses <= 0) {
    return 0;
  }
  const fullBlocks = Math.floor(totalPresses / 45);
  const remainder = totalPresses % 45;
  const cat2InRemainder = Math.min(5, Math.max(0, remainder - 10));
  const cat2Presses = 5 * fullBlocks + cat2InRemainder;
  const companion147Multi = hasCompanion147 ? 1.5 : 1;
  const grid125 = readGridBonus(root, 125, 5, gridAllMulti);
  const grid125Multi = 1 + grid125 / 100;
  return cat2Presses * 2 * companion147Multi * grid125Multi;
}

// Event Shop bonus 45 (Sushi_Bucks) flag. Owned iff `number2letter[45] = "S"`
// appears in OptLacc[311]. Source: toolbox parsers/misc.ts.
function readEventShopBonus45(root: IdleonRawData): number {
  const opt = parseArrayValue(root.OptLacc);
  if (!Array.isArray(opt)) {
    return 0;
  }
  const eventStr = String(opt[311] ?? "");
  const marker = letterAt(45);
  return marker !== "" && eventStr.includes(marker) ? 1 : 0;
}
