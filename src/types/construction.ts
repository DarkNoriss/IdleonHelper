export type ParsedCog = {
  key: number;
  buildRate: unknown;
  isPlayer: boolean;
  expGain: unknown;
  flaggy: unknown;
  expBonus: unknown;
  buildRadiusBoost: unknown;
  expRadiusBoost: unknown;
  flaggyRadiusBoost: unknown;
  boostRadius: unknown;
  flagBoost: unknown;
  nothing: unknown;
  fixed: boolean;
  blocked: boolean;
};

export type SmallCogBonuses = {
  build: number;
  flaggy: number;
  exp: number;
};

export type ParsedConstructionData = {
  cogs: Record<number, ParsedCog>;
  slots: Record<number, ParsedCog>;
  flagPose: number[];
  flaggyShopUpgrades: number;
  smallCogBonuses: SmallCogBonuses;
  availableSlotKeys: number[];
  score: Score | null;
};

export type Score = {
  buildRate: number;
  expBonus: number;
  flaggy: number;
};

export type OptimalStep = {
  from: {
    location: "board" | "build" | "spare";
    x: number;
    y: number;
  };
  to: {
    location: "board" | "build" | "spare";
    x: number;
    y: number;
  };
};

export type SolverFocus = "exp" | "buildRate" | "flaggy";

export type SolverWeights = {
  focus: SolverFocus;
  flaggy: number;
};

export type SolverResult = {
  score: Score;
  steps: OptimalStep[];
};

export type SolverProgress = {
  bestScore: Score;
  currentScore: Score;
  iter: number;
  iterPerSec: number;
  elapsedMs: number;
  restarts: number;
  improvementPct: number;
};

export type SolverWorkerMessage =
  | {
      type: "solve";
      data: ParsedConstructionData;
      weights: SolverWeights;
      solveTimeMs: number;
    }
  | { type: "cancel" };

export type SolverWorkerEvent =
  | { type: "progress"; progress: SolverProgress }
  | { type: "done"; result: SolverResult | null }
  | { type: "error"; message: string; stack?: string }
  | { type: "log"; level: "log" | "info" | "warn" | "error"; message: string };
