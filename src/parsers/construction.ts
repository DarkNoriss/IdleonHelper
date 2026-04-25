import type {
  ParsedCog,
  ParsedConstructionData,
  Score,
  SmallCogBonuses,
} from "../types/construction";
import type { RawJson } from "../types/raw-json";

export const INV_ROWS = 8;
export const INV_COLUMNS = 12;
export const BOARD_SIZE = INV_ROWS * INV_COLUMNS;
export const SPARE_START = 108;
export const SMALL_COG_LEFT_INDEX = 228;
export const SMALL_COG_COLUMN_HEIGHT = 12;
export const SMALL_COG_TOTAL = SMALL_COG_COLUMN_HEIGHT * 2;

export type Position = {
  location: "board" | "build" | "spare";
  x: number;
  y: number;
};

export const getPosition = (keyNum: number): Position => {
  // board = 0-95
  // build = 96-107
  // spare = 108-*
  const location: "board" | "build" | "spare" =
    keyNum >= 96 ? (keyNum <= 107 ? "build" : "spare") : "board";

  let perRow = 3;
  let offset = SPARE_START;

  if (location === "board") {
    perRow = INV_COLUMNS;
    offset = 0;
  } else if (location === "build") {
    offset = 96;
  }

  const y = Math.floor((keyNum - offset) / perRow);
  const x = (keyNum - offset) % perRow;

  return { location, x, y };
};

type CogRaw = {
  a?: unknown;
  b?: unknown;
  c?: unknown;
  d?: unknown;
  e?: unknown;
  f?: unknown;
  g?: unknown;
  h?: unknown;
  j?: unknown;
  k?: unknown;
};

// Raw JSON may be wrapped (`{ data: {...} }`) or flat (`{ CogM, CogO, ... }`).
type GameData = RawJson["data"];

const getData = (jsonData: RawJson): GameData => {
  const candidate = jsonData as unknown as { data?: GameData };
  if (
    candidate.data &&
    typeof candidate.data === "object" &&
    !Array.isArray(candidate.data)
  ) {
    return candidate.data;
  }
  return jsonData as unknown as GameData;
};

export const parseConstruction = (
  jsonData: RawJson
): ParsedConstructionData => {
  const cogsArray = extractCogs(jsonData);
  const flaggyShopUpgrades = extractFlaggyShopUpgrades(jsonData);
  const flagPose = extractFlagPose(jsonData);
  const flagSlots = extractFlagSlots(jsonData, flagPose);
  const cogOrder = extractCogOrder(jsonData);
  const smallCogBonuses = computeSmallCogBonuses(cogOrder);

  const slots: Record<number, ParsedCog> = {};
  const availableSlotKeys: number[] = [];
  for (const slot of flagSlots) {
    slots[slot.key] = slot;
    // Flag-pose slots only apply on the board (0..95). FlagU may carry -11
    // markers at build/spare indices, but treating those as movable slots
    // lets SA swap board cogs into build positions where they score 0 and
    // become unreachable (getValidMoves skips build cogs), producing final
    // states the step generator cannot reproduce.
    if (!slot.fixed && slot.key < BOARD_SIZE) {
      availableSlotKeys.push(slot.key);
    }
  }

  const cogs: Record<number, ParsedCog> = {};
  if (cogsArray !== null) {
    for (const cog of cogsArray) {
      cogs[cog.key] = cog;
    }
  }

  const score = calculateScore({
    cogs,
    flaggyShopUpgrades,
    smallCogBonuses,
    flagPose,
    slots,
    availableSlotKeys,
  });

  return {
    cogs,
    slots,
    flagPose,
    flaggyShopUpgrades,
    smallCogBonuses,
    availableSlotKeys,
    score,
  };
};

const extractCogs = (jsonData: RawJson): ParsedCog[] | null => {
  const cogM = getData(jsonData).CogM;
  if (!cogM) {
    return null;
  }

  let parsed: unknown;
  try {
    // Handle both string (needs parsing) and already-parsed object
    if (typeof cogM === "string") {
      parsed = JSON.parse(cogM);
    } else if (
      typeof cogM === "object" &&
      cogM !== null &&
      !Array.isArray(cogM)
    ) {
      parsed = cogM;
    } else {
      return null;
    }
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      const cogsMap = parsed as Record<string, CogRaw>;
      const mappedCogs = Object.entries(cogsMap).map(([key, c]) => {
        const keyNum = Number.parseInt(key, 10);
        return {
          cogId: `m-${keyNum}`,
          key: keyNum,
          buildRate: c.a,
          isPlayer: (c.b as number) > 0,
          expGain: c.b,
          flaggy: c.c,
          expBonus: c.d,
          buildRadiusBoost: c.e,
          expRadiusBoost: c.f,
          flaggyRadiusBoost: c.g,
          boostRadius: c.h,
          flagBoost: c.j,
          nothing: c.k,
          fixed: c.h === "everything",
          blocked: false,
        };
      });
      return mappedCogs;
    }
  } catch {
    return null;
  }

  return null;
};

const extractCogOrder = (jsonData: RawJson): string[] => {
  const cogO = getData(jsonData).CogO;
  if (!cogO) {
    return [];
  }

  let parsed: unknown;
  try {
    if (typeof cogO === "string") {
      parsed = JSON.parse(cogO);
    } else if (Array.isArray(cogO)) {
      parsed = cogO as unknown[];
    } else {
      return [];
    }
    if (Array.isArray(parsed)) {
      return parsed.map((v) => (typeof v === "string" ? v : ""));
    }
  } catch {
    return [];
  }

  return [];
};

// number2letter from toolbox: index 0 = '_', 1 = 'a', 2 = 'b', 3 = 'c', ...
// Small cog name format: CogSm{type}{level} where type is one of '_', 'a', 'b'.
// typeIndex 0 (_) — base x2, applies as multiplier on flaggy
// typeIndex 1 (a) — base x4, applies as multiplier on buildRate
// typeIndex 2 (b) — base x1, applies as multiplier on expBonus
const SMALL_COG_PREFIX = "CogSm";

const getSmallCogBonus = (
  cogName: string | undefined
): { typeIndex: number; bonus: number } | null => {
  if (!cogName?.startsWith(SMALL_COG_PREFIX)) {
    return null;
  }
  const typeChar = cogName.charAt(SMALL_COG_PREFIX.length);
  const level = Number.parseInt(cogName.slice(SMALL_COG_PREFIX.length + 1), 10);
  if (Number.isNaN(level)) {
    return null;
  }
  let typeIndex: number;
  if (typeChar === "_") {
    typeIndex = 0;
  } else if (typeChar === "a") {
    typeIndex = 1;
  } else if (typeChar === "b") {
    typeIndex = 2;
  } else {
    return null;
  }
  const base = (25 + 25 * level * level) * (1 + level / 5);
  let bonus: number;
  if (typeIndex === 0) {
    bonus = Math.round(2 * base);
  } else if (typeIndex === 1) {
    bonus = Math.round(4 * base);
  } else {
    bonus = Math.round(base);
  }
  return { typeIndex, bonus };
};

const computeSmallCogBonuses = (cogOrder: string[]): SmallCogBonuses => {
  const totals: SmallCogBonuses = { build: 0, flaggy: 0, exp: 0 };
  for (let i = 0; i < SMALL_COG_TOTAL; i++) {
    const result = getSmallCogBonus(cogOrder[SMALL_COG_LEFT_INDEX + i]);
    if (!result) {
      continue;
    }
    if (result.typeIndex === 0) {
      totals.flaggy += result.bonus;
    } else if (result.typeIndex === 1) {
      totals.build += result.bonus;
    } else if (result.typeIndex === 2) {
      totals.exp += result.bonus;
    }
  }
  return totals;
};

const extractFlaggyShopUpgrades = (jsonData: RawJson): number => {
  const gemItemsPurchased = getData(jsonData).GemItemsPurchased;
  if (!gemItemsPurchased) {
    return 0;
  }

  let parsed: unknown;
  try {
    // Handle both string (needs parsing) and already-parsed array
    if (typeof gemItemsPurchased === "string") {
      parsed = JSON.parse(gemItemsPurchased);
    } else if (Array.isArray(gemItemsPurchased)) {
      parsed = gemItemsPurchased as unknown[];
    } else {
      return 0;
    }
    if (Array.isArray(parsed) && parsed.length > 118) {
      const value = parsed[118];
      return typeof value === "number" ? value : 0;
    }
  } catch {
    return 0;
  }

  return 0;
};

const extractFlagPose = (jsonData: RawJson): number[] => {
  const flagP = getData(jsonData).FlagP;
  if (!flagP) {
    return [];
  }

  let parsed: unknown;
  try {
    // Handle both string (needs parsing) and already-parsed array
    if (typeof flagP === "string") {
      parsed = JSON.parse(flagP);
    } else if (Array.isArray(flagP)) {
      parsed = flagP as unknown[];
    } else {
      return [];
    }
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is number => typeof v === "number" && v >= 0);
    }
  } catch {
    return [];
  }

  return [];
};

const extractFlagSlots = (
  jsonData: RawJson,
  flagPose: number[]
): ParsedCog[] => {
  const flagU = getData(jsonData).FlagU;
  if (!flagU) {
    return [];
  }

  let parsed: unknown;
  try {
    // Handle both string (needs parsing) and already-parsed array
    if (typeof flagU === "string") {
      parsed = JSON.parse(flagU);
    } else if (Array.isArray(flagU)) {
      parsed = flagU as unknown[];
    } else {
      return [];
    }
    if (Array.isArray(parsed)) {
      return parsed.map((n, i) => {
        if (n > 0 && flagPose.includes(i)) {
          return {
            cogId: `s-${i}`,
            key: i,
            buildRate: null,
            isPlayer: false,
            expGain: null,
            flaggy: null,
            expBonus: null,
            buildRadiusBoost: null,
            expRadiusBoost: null,
            flaggyRadiusBoost: null,
            boostRadius: null,
            flagBoost: null,
            nothing: null,
            fixed: true,
            blocked: true,
          };
        }
        if (n !== -11) {
          return {
            cogId: `s-${i}`,
            key: i,
            buildRate: null,
            isPlayer: false,
            expGain: null,
            flaggy: null,
            expBonus: null,
            buildRadiusBoost: null,
            expRadiusBoost: null,
            flaggyRadiusBoost: null,
            boostRadius: null,
            flagBoost: null,
            nothing: null,
            fixed: true,
            blocked: true,
          };
        }
        return {
          cogId: `s-${i}`,
          key: i,
          buildRate: null,
          isPlayer: false,
          expGain: null,
          flaggy: null,
          expBonus: null,
          buildRadiusBoost: null,
          expRadiusBoost: null,
          flaggyRadiusBoost: null,
          boostRadius: null,
          flagBoost: null,
          nothing: null,
          fixed: false,
          blocked: false,
        };
      });
    }
  } catch {
    return [];
  }

  return [];
};

const safeGet = <T>(arr: unknown, ...indexes: number[]): T | undefined => {
  let current: unknown = arr;
  for (const index of indexes) {
    if (current === undefined || current === null) {
      break;
    }
    if (typeof current === "object" && Array.isArray(current)) {
      current = current[index];
    } else {
      return undefined;
    }
  }
  return current as T | undefined;
};

const getEntry = (
  key: number,
  cogs: Record<number, ParsedCog>,
  slots: Record<number, ParsedCog>
): ParsedCog | undefined => {
  return cogs[key] ?? slots[key];
};

type RadiusBonus = { build: number; flaggy: number; exp: number };

const getBoostedCoords = (
  pattern: string,
  i: number,
  j: number
): number[][] => {
  switch (pattern) {
    case "diagonal":
      return [
        [i - 1, j - 1],
        [i - 1, j + 1],
        [i + 1, j - 1],
        [i + 1, j + 1],
      ];
    case "adjacent":
      return [
        [i - 1, j],
        [i, j + 1],
        [i + 1, j],
        [i, j - 1],
      ];
    case "up":
      return [
        [i - 2, j - 1],
        [i - 2, j],
        [i - 2, j + 1],
        [i - 1, j - 1],
        [i - 1, j],
        [i - 1, j + 1],
      ];
    case "right":
      return [
        [i - 1, j + 2],
        [i, j + 2],
        [i + 1, j + 2],
        [i - 1, j + 1],
        [i, j + 1],
        [i + 1, j + 1],
      ];
    case "down":
      return [
        [i + 2, j - 1],
        [i + 2, j],
        [i + 2, j + 1],
        [i + 1, j - 1],
        [i + 1, j],
        [i + 1, j + 1],
      ];
    case "left":
      return [
        [i - 1, j - 2],
        [i, j - 2],
        [i + 1, j - 2],
        [i - 1, j - 1],
        [i, j - 1],
        [i + 1, j - 1],
      ];
    case "row": {
      const out: number[][] = [];
      for (let k = 0; k < INV_COLUMNS; k++) {
        if (j === k) {
          continue;
        }
        out.push([i, k]);
      }
      return out;
    }
    case "column": {
      const out: number[][] = [];
      for (let k = 0; k < INV_ROWS; k++) {
        if (i === k) {
          continue;
        }
        out.push([k, j]);
      }
      return out;
    }
    case "corners":
      return [
        [i - 2, j - 2],
        [i - 2, j + 2],
        [i + 2, j - 2],
        [i + 2, j + 2],
      ];
    case "around":
      return [
        [i - 2, j],
        [i - 1, j - 1],
        [i - 1, j],
        [i - 1, j + 1],
        [i, j - 2],
        [i, j - 1],
        [i, j + 1],
        [i, j + 2],
        [i + 1, j - 1],
        [i + 1, j],
        [i + 1, j + 1],
        [i + 2, j],
      ];
    case "everything": {
      const out: number[][] = [];
      for (let k = 0; k < INV_ROWS; k++) {
        for (let l = 0; l < INV_COLUMNS; l++) {
          if (i === k && j === l) {
            continue;
          }
          out.push([k, l]);
        }
      }
      return out;
    }
    default:
      return [];
  }
};

export const calculateScore = (
  data: Omit<ParsedConstructionData, "score">
): Score | null => {
  const bonusGrid: RadiusBonus[][] = new Array(INV_ROWS)
    .fill(0)
    .map(() =>
      new Array(INV_COLUMNS)
        .fill(0)
        .map(() => ({ build: 0, flaggy: 0, exp: 0 }))
    );

  for (let key = 0; key < BOARD_SIZE; key++) {
    const entry = getEntry(key, data.cogs, data.slots);
    if (!entry) {
      continue;
    }
    if (!entry.boostRadius || typeof entry.boostRadius !== "string") {
      continue;
    }

    const { x: j, y: i } = getPosition(key);
    const buildBoost =
      typeof entry.buildRadiusBoost === "number" ? entry.buildRadiusBoost : 0;
    const flaggyBoost =
      typeof entry.flaggyRadiusBoost === "number" ? entry.flaggyRadiusBoost : 0;
    const expBoost =
      typeof entry.expRadiusBoost === "number" ? entry.expRadiusBoost : 0;
    if (buildBoost === 0 && flaggyBoost === 0 && expBoost === 0) {
      continue;
    }

    for (const coord of getBoostedCoords(entry.boostRadius, i, j)) {
      const bi = coord[0];
      const bj = coord[1];
      if (bi === undefined || bj === undefined) {
        continue;
      }
      const cell = safeGet<RadiusBonus>(bonusGrid, bi, bj);
      if (!cell) {
        continue;
      }
      cell.build += buildBoost;
      cell.flaggy += flaggyBoost;
      cell.exp += expBoost;
    }
  }

  let totalBuildRate = 0;
  let totalFlaggy = 0;
  let totalExpBonus = 0;
  let totalPlayerExpRate = 0;

  for (let key = 0; key < BOARD_SIZE; key++) {
    const entry = getEntry(key, data.cogs, data.slots);
    if (!entry) {
      continue;
    }

    const baseBuild = typeof entry.buildRate === "number" ? entry.buildRate : 0;
    const baseFlaggy = typeof entry.flaggy === "number" ? entry.flaggy : 0;
    const baseExpBonus =
      typeof entry.expBonus === "number" ? entry.expBonus : 0;
    const baseExpGain = typeof entry.expGain === "number" ? entry.expGain : 0;

    const { x: j, y: i } = getPosition(key);
    const cell = safeGet<RadiusBonus>(bonusGrid, i, j);
    const buildBoost = cell ? cell.build : 0;
    const flaggyBoost = cell ? cell.flaggy : 0;
    const expBoost = cell ? cell.exp : 0;

    totalBuildRate += Math.max(baseBuild * (1 + buildBoost / 100), 0);
    totalFlaggy += Math.max(baseFlaggy * (1 + flaggyBoost / 100), 0);
    totalExpBonus += baseExpBonus;

    if (entry.isPlayer && baseExpGain > 0) {
      totalPlayerExpRate += baseExpGain * (1 + expBoost / 100);
    }
  }

  // Mirror toolbox: only the exp small-cog multiplier is reflected in the
  // displayed score. Build/flaggy small cogs affect the actual game rate
  // through a separate mechanism that does not appear in the totals.
  const finalExpBonus = totalExpBonus * (1 + data.smallCogBonuses.exp / 100);
  const finalFlaggy = totalFlaggy * (1 + data.flaggyShopUpgrades * 0.5);
  const playerExpRate = totalPlayerExpRate * (1 + finalExpBonus / 100);

  return {
    buildRate: totalBuildRate,
    expBonus: finalExpBonus,
    flaggy: finalFlaggy,
    playerExpRate,
  };
};
