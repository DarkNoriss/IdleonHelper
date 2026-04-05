import {
  calculateScore,
  getPosition,
  INV_COLUMNS,
  SPARE_START,
} from "../../../parsers/construction";
import type {
  ParsedCog,
  ParsedConstructionData,
  Score,
  SolverWeights,
} from "../../../types/construction";

export const getKeyFromPosition = (
  location: "board" | "build" | "spare",
  x: number,
  y: number
): number => {
  if (location === "board") {
    return y * INV_COLUMNS + x;
  }
  if (location === "build") {
    return 96 + y * 3 + x;
  }
  return SPARE_START + y * 3 + x;
};

export const getScoreSum = (score: Score, weights: SolverWeights): number => {
  // Use playerExpRate for exp optimization (actual exp gain)
  // Fall back to old calculation for other focuses
  const expValue = score.playerExpRate || 0;
  const buildRateValue = score.buildRate;
  const flaggyValue = (score.flaggy * (score.flagBoost + 4)) / 4;

  // Huge multiplier for primary priority (ensures it dominates)
  const PRIMARY_MULTIPLIER = 1e15;
  // Small multiplier for secondary priority (tiebreaker)
  const SECONDARY_MULTIPLIER = 1;

  let res = 0;

  switch (weights.focus) {
    case "exp": {
      // Exp is primary, buildRate is secondary
      // Use playerExpRate which includes actual expGain values
      res += expValue * PRIMARY_MULTIPLIER;
      res += buildRateValue * SECONDARY_MULTIPLIER;
      // Flaggy is optional (weight can be 0)
      res += flaggyValue * weights.flaggy;
      break;
    }
    case "buildRate": {
      // BuildRate is primary, exp is secondary
      res += buildRateValue * PRIMARY_MULTIPLIER;
      res += expValue * SECONDARY_MULTIPLIER;
      // Flaggy is optional (weight can be 0)
      res += flaggyValue * weights.flaggy;
      break;
    }
    case "flaggy": {
      // Flaggy is primary, exp is secondary
      res += flaggyValue * PRIMARY_MULTIPLIER;
      res += expValue * SECONDARY_MULTIPLIER;
      // BuildRate is not considered when focusing flaggy
      break;
    }
    default:
      break;
  }

  return res;
};

export const cloneInventory = (
  inventory: ParsedConstructionData
): ParsedConstructionData => {
  const clonedCogs: Record<number, ParsedCog> = {};
  for (const [keyStr, cog] of Object.entries(inventory.cogs)) {
    clonedCogs[Number.parseInt(keyStr, 10)] = { ...cog };
  }

  const clonedSlots: Record<number, ParsedCog> = {};
  for (const [keyStr, slot] of Object.entries(inventory.slots)) {
    clonedSlots[Number.parseInt(keyStr, 10)] = { ...slot };
  }

  return {
    cogs: clonedCogs,
    slots: clonedSlots,
    flagPose: [...inventory.flagPose],
    flaggyShopUpgrades: inventory.flaggyShopUpgrades,
    availableSlotKeys: [...inventory.availableSlotKeys],
    score: null,
  };
};

export const moveCog = (
  inventory: ParsedConstructionData,
  fromKey: number,
  toKey: number
): void => {
  // Get cogs from both cogs and slots (like getEntry does)
  const fromCog = inventory.cogs[fromKey] ?? inventory.slots[fromKey];
  const toCog = inventory.cogs[toKey] ?? inventory.slots[toKey];

  if (!fromCog) {
    return;
  }

  // Swap cogs
  const temp = toCog;
  if (fromCog) {
    inventory.cogs[toKey] = { ...fromCog, key: toKey };
    // Remove from slots if it was there
    if (inventory.slots[fromKey]) {
      delete inventory.slots[fromKey];
    }
  } else {
    delete inventory.cogs[toKey];
  }

  if (temp) {
    inventory.cogs[fromKey] = { ...temp, key: fromKey };
    // Remove from slots if it was there
    if (inventory.slots[toKey]) {
      delete inventory.slots[toKey];
    }
  } else {
    delete inventory.cogs[fromKey];
  }

  inventory.score = null;
};

export const getCogKeys = (inventory: ParsedConstructionData): number[] => {
  return Object.keys(inventory.cogs).map((k) => Number.parseInt(k, 10));
};

export const getEntry = (
  key: number,
  inventory: ParsedConstructionData
): ParsedCog | undefined => {
  return inventory.cogs[key] ?? inventory.slots[key];
};

export const calculateStateScore = (
  state: ParsedConstructionData
): Score | null => {
  return calculateScore({
    cogs: state.cogs,
    slots: state.slots,
    flagPose: state.flagPose,
    flaggyShopUpgrades: state.flaggyShopUpgrades,
    availableSlotKeys: state.availableSlotKeys,
  });
};

export const shuffle = (inventory: ParsedConstructionData, n = 2000): void => {
  const allSlots = inventory.availableSlotKeys;
  for (let i = 0; i < n; i++) {
    const slotKey = allSlots[Math.floor(Math.random() * allSlots.length)]!;
    const allKeys = getCogKeys(inventory);
    const cogKey = allKeys[Math.floor(Math.random() * allKeys.length)]!;
    const slot = getEntry(slotKey, inventory);
    const cog = getEntry(cogKey, inventory);

    if (!(slot && cog)) {
      continue;
    }
    if (slot.fixed || cog.fixed) {
      continue;
    }

    const cogPosition = getPosition(cogKey);
    if (cogPosition.location === "build") {
      continue;
    }

    moveCog(inventory, cogKey, slotKey);
  }
};
