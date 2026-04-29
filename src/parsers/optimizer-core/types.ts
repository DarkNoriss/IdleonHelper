export type OptimizerStep = {
  rank: number;
  slot: number;
  name: string;
  fromLevel: number;
  toLevel: number;
  cost: number;
  resourceId: string;
  gain: number | null;
  efficiency: number | null;
};

export type OptimizerRow = {
  rank: number;
  name: string;
  fromLevel: number;
  toLevel: number;
  cost: number;
  resourceId: string;
  gain: number | null;
  efficiency: number | null;
  count: number;
};

export type OptimizerGroupMode = "none" | "upgrade" | "summary";

export type GateResult =
  | { ok: true }
  | { ok: false; reason: "maxed" | "locked" | "unaffordable" | "no-gain" };

export type ScoreInputFn<TState> = (slot: number, state: TState) => number;
export type GainFn<TState> = (slot: number, state: TState) => number | null;
export type GateFn<TState> = (slot: number, state: TState) => GateResult;
export type ApplyFn<TState> = (slot: number, state: TState) => TState;
export type ResourceOfFn<TState> = (
  slot: number,
  state: TState
) => { id: string; cost: number };

export type ComputePathInput<TState> = {
  initialState: TState;
  slotCount: number;
  maxSteps: number;
  score: ScoreInputFn<TState>;
  gain: GainFn<TState>;
  apply: ApplyFn<TState>;
  gates: GateFn<TState>[];
  resourceOf: ResourceOfFn<TState>;
  nameOf: (slot: number) => string;
  fromLevel: (slot: number, state: TState) => number;
};
