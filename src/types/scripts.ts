import type { CompassUpgrade } from "./compass";
import type { OptimalStep } from "./construction";

export type WeeklyBattleStep = {
  stepName: string;
  steps: number[];
  rawSteps: string[];
};

export type WeeklyBattleInfo = {
  dateFrom: string;
  dateTo: string;
  bossName: string;
  steps: WeeklyBattleStep[];
};

export type WeeklyBattleData = {
  fetchedAt: string;
  info: WeeklyBattleInfo;
};

export type ScriptMap = {
  "world6.farming.beanTradingGetTickets": { args: []; result: undefined };
  "world6.farming.beanTradingTradeCrops": { args: []; result: undefined };
  "world6.farming.farmingCollectCrops": { args: [number]; result: undefined };
  "world6.farming.farmingCollectCropsDebug": { args: []; result: undefined };
  "world6.summoning.startAutobattler": { args: []; result: undefined };
  "world6.summoning.startEndlessAutobattler": { args: []; result: undefined };
  "world7.sushiStation.sushiStationMerge": {
    args: [boolean];
    result: undefined;
  };
  "world7.sushiStation.sushiStationMergeDebug": { args: []; result: undefined };
  "world3.construction.apply": { args: [OptimalStep[]]; result: undefined };
  "world3.construction.collectCogs": { args: []; result: undefined };
  "world3.construction.trashCogs": { args: []; result: undefined };
  "world3.trapping.collectTraps": { args: [string]; result: undefined };
  "world3.trapping.placeTraps": {
    args: [string, string, string];
    result: undefined;
  };
  "world2.weeklyBattle.run": { args: [number[]]; result: undefined };
  "general.storeItems.run": { args: []; result: undefined };
  "general.candy.run": { args: [string]; result: undefined };
  "general.cardPresets.apply": { args: [number]; result: undefined };
  "general.cardPresets.select": { args: [number]; result: undefined };
  "general.bossFarmer.run": { args: [number]; result: undefined };
  "general.debug.findAttackSkill": { args: [string]; result: undefined };
  "classSpecific.compass.run": {
    args: [CompassUpgrade[]];
    result: undefined;
  };
  "classSpecific.compass.discover": {
    args: [string];
    result: undefined;
  };
  "classSpecific.compass.discoverAll": {
    args: [];
    result: undefined;
  };
  "classSpecific.compass.minorDebug": {
    args: [string];
    result: undefined;
  };
  "classSpecific.compass.calibrate": {
    args: [];
    result: undefined;
  };
  "classSpecific.compass.stressTestNav": {
    args: [];
    result: undefined;
  };
};

export type BossFarmerState = {
  iteration: number;
  total: number;
  running: boolean;
  avgIterationMs: number;
  estimatedRemainingMs: number;
};

export type ConnectionStatus = "connecting" | "connected" | "error";

export type EngineState = "idle" | "running" | "paused";

export type QueueItemStatus = "queued" | "running" | "failed";

export type QueueItem = {
  itemId: string;
  scriptId: keyof ScriptMap;
  scriptName: string;
  args: unknown[];
  enqueuedAt: number;
  nextRunAt: number;
  recurring: boolean;
  intervalMs?: number;
  status: QueueItemStatus;
  lastError?: string;
};

export type QueueSnapshot = {
  engineState: EngineState;
  runningItem: QueueItem | null;
  queue: QueueItem[];
};

export type AppState = {
  queue: QueueSnapshot;
  scriptStatus: {
    current: string | null;
    isWorking: boolean;
  };
  backendStatus: {
    status: ConnectionStatus;
    error: string | null;
  };
  weeklyBattle: {
    data: WeeklyBattleData | null;
    fetchedAt: string | null;
  };
  bossFarmer: BossFarmerState;
  collectTraps: { endsAt: number | null };
  placeTraps: { current: number | null };
};
