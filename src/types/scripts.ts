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
  "world6.farming.start": { args: []; result: undefined };
  "world6.farming.lockUnlock": { args: []; result: undefined };
  "world6.summoning.startAutobattler": { args: []; result: undefined };
  "world6.summoning.startEndlessAutobattler": { args: []; result: undefined };
  "world3.construction.apply": { args: [OptimalStep[]]; result: undefined };
  "world3.construction.collectCogs": { args: []; result: undefined };
  "world3.construction.trashCogs": { args: []; result: undefined };
  "world3.trapping.collectTraps": { args: [string, string]; result: undefined };
  "world3.trapping.placeTraps": {
    args: [string, string, string];
    result: undefined;
  };
  "world2.weeklyBattle.run": { args: [number[]]; result: undefined };
  "general.test.run": { args: []; result: undefined };
  "general.storeItems.run": { args: []; result: undefined };
  "general.candy.run": { args: [string]; result: undefined };
  "general.bossFarmer.run": { args: [number]; result: undefined };
  "classSpecific.compass.run": {
    args: [CompassUpgrade[]];
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

export type AppState = {
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
