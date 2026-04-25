import { create } from "zustand";
import { parseConstruction } from "@/parsers/construction";
import { useConnectionStore } from "@/store/connection";
import { useRawJsonStore } from "@/store/raw-json";
import type { Score, SolverFocus, SolverResult } from "@/types/construction";
import type { QueueSnapshot, ScriptMap } from "@/types/scripts";

export type LoopSolveStatus = "idle" | "running" | "cancelling";

export type LoopFinalOutcome =
  | {
      kind: "completed-no-improvement";
      iterations: number;
      totalGainPct: number;
    }
  | { kind: "completed-cap"; iterations: number; totalGainPct: number }
  | { kind: "cancelled"; iterations: number }
  | { kind: "error"; iterations: number; message: string };

type LoopSolveState = {
  status: LoopSolveStatus;
  iteration: number;
  startScore: Score | null;
  lastImprovementPct: number | null;
  lastOutcome: LoopFinalOutcome | null;
  cancelRequested: boolean;

  start: (focus: SolverFocus) => Promise<void>;
  stop: () => Promise<void>;
  clearOutcome: () => void;
};

const MAX_ITERATIONS = 10;
const SOLVE_TIME_MS = 600_000; // 10 min — matches existing solo-solve default
const FRESH_DATA_TIMEOUT_MS = 60_000;

export const SCORE_FIELD: Record<SolverFocus, keyof Score> = {
  exp: "expBonus",
  buildRate: "buildRate",
  flaggy: "flaggy",
};

const improvementPctFor = (
  focus: SolverFocus,
  prev: Score | null,
  next: Score | null
): number => {
  if (!(prev && next)) {
    return 0;
  }
  const field = SCORE_FIELD[focus];
  const a = prev[field];
  const b = next[field];
  if (a === 0) {
    return b === 0 ? 0 : 100;
  }
  return ((b - a) / a) * 100;
};

type EnqueueResult = "completed" | "removed" | "cancelled";

export const enqueueAndAwait = async <K extends keyof ScriptMap>(
  scriptId: K,
  args: ScriptMap[K]["args"],
  isCancelRequested: () => boolean
): Promise<EnqueueResult> => {
  const { itemId } = await (
    window.api.queue.enqueue as (
      id: string,
      ...a: unknown[]
    ) => Promise<{ itemId: string }>
  )(scriptId, ...(args as unknown[]));

  let sawRunning = false;

  return await new Promise<EnqueueResult>((resolve) => {
    let settled = false;
    let unsub: (() => void) | null = null;

    const check = (snap: QueueSnapshot): EnqueueResult | null => {
      if (isCancelRequested()) {
        return "cancelled";
      }
      const isRunning = snap.runningItem?.itemId === itemId;
      const isQueued = snap.queue.some((i) => i.itemId === itemId);
      if (isRunning) {
        sawRunning = true;
      }
      if (!(isRunning || isQueued)) {
        return sawRunning ? "completed" : "removed";
      }
      return null;
    };

    const settle = (verdict: EnqueueResult) => {
      if (settled) {
        return;
      }
      settled = true;
      unsub?.();
      unsub = null;
      resolve(verdict);
    };

    unsub = window.api.state.subscribe("queue", (raw) => {
      const verdict = check(raw as QueueSnapshot);
      if (verdict !== null) {
        settle(verdict);
      }
    });

    window.api.state.get("queue").then((raw) => {
      const verdict = check(raw as QueueSnapshot);
      if (verdict !== null) {
        settle(verdict);
      }
    }, undefined);
  });
};

type FreshDataResult = "fresh" | "cancelled";

export const waitForFreshLastUpdated = (
  prevMs: number | null,
  timeoutMs: number,
  isCancelRequested: () => boolean
): Promise<FreshDataResult> => {
  return new Promise<FreshDataResult>((resolve, reject) => {
    const isFresh = (currentMs: number | null): boolean => {
      if (currentMs == null) {
        return false;
      }
      if (prevMs == null) {
        return true;
      }
      return currentMs > prevMs;
    };

    if (isCancelRequested()) {
      resolve("cancelled");
      return;
    }
    if (isFresh(useConnectionStore.getState().lastUpdated)) {
      resolve("fresh");
      return;
    }

    let settled = false;
    let unsubscribe: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelPoll: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (cancelPoll !== null) {
        clearInterval(cancelPoll);
        cancelPoll = null;
      }
      unsubscribe?.();
      unsubscribe = null;
    };

    const settle = (
      kind: "resolve" | "reject",
      value: FreshDataResult | Error
    ) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (kind === "resolve") {
        resolve(value as FreshDataResult);
      } else {
        reject(value as Error);
      }
    };

    timer = setTimeout(() => {
      settle(
        "reject",
        new Error(
          `cloudsave did not propagate within ${Math.round(timeoutMs / 1000)}s`
        )
      );
    }, timeoutMs);

    cancelPoll = setInterval(() => {
      if (isCancelRequested()) {
        settle("resolve", "cancelled");
      }
    }, 500);

    unsubscribe = useConnectionStore.subscribe((state) => {
      if (isCancelRequested()) {
        settle("resolve", "cancelled");
        return;
      }
      if (isFresh(state.lastUpdated)) {
        settle("resolve", "fresh");
      }
    });
  });
};

const runLoop = async (
  focus: SolverFocus,
  set: (partial: Partial<LoopSolveState>) => void,
  get: () => LoopSolveState
): Promise<void> => {
  const isCancelRequested = () => get().cancelRequested;

  let startScore: Score | null = null;
  let lastResult: SolverResult | null = null;
  let prevLastUpdated = useConnectionStore.getState().lastUpdated;
  let completedIterations = 0;

  set({
    status: "running",
    iteration: 0,
    startScore: null,
    lastImprovementPct: null,
    lastOutcome: null,
    cancelRequested: false,
  });

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    if (isCancelRequested()) {
      break;
    }

    set({ iteration: i });

    const parsed = useRawJsonStore.getState().parsedJson;
    const construction = parsed ? parseConstruction(parsed) : null;
    if (!construction) {
      set({
        status: "idle",
        cancelRequested: false,
        lastOutcome: {
          kind: "error",
          iterations: completedIterations,
          message: "no construction data available",
        },
      });
      return;
    }

    if (i === 1) {
      startScore = construction.score;
      set({ startScore });
    }

    let result: SolverResult | null = null;
    try {
      result = await window.api.script.world3.construction.solver(
        construction,
        { focus, flaggy: 0 },
        SOLVE_TIME_MS
      );
    } catch (err) {
      set({
        status: "idle",
        cancelRequested: false,
        lastOutcome: {
          kind: "error",
          iterations: completedIterations,
          message: err instanceof Error ? err.message : "solver failed",
        },
      });
      return;
    }
    if (isCancelRequested()) {
      break;
    }
    if (!result || result.steps.length === 0) {
      set({
        status: "idle",
        cancelRequested: false,
        lastOutcome: {
          kind: "completed-no-improvement",
          iterations: completedIterations,
          totalGainPct: improvementPctFor(
            focus,
            startScore,
            lastResult?.score ?? startScore
          ),
        },
      });
      return;
    }
    lastResult = result;
    set({
      lastImprovementPct: improvementPctFor(
        focus,
        construction.score,
        result.score
      ),
    });

    let applyResult: EnqueueResult;
    try {
      applyResult = await enqueueAndAwait(
        "world3.construction.apply",
        [result.steps],
        isCancelRequested
      );
    } catch (err) {
      set({
        status: "idle",
        cancelRequested: false,
        lastOutcome: {
          kind: "error",
          iterations: completedIterations,
          message: err instanceof Error ? err.message : "apply failed",
        },
      });
      return;
    }
    if (applyResult === "cancelled") {
      break;
    }
    if (applyResult === "removed") {
      set({
        status: "idle",
        cancelRequested: false,
        lastOutcome: {
          kind: "error",
          iterations: completedIterations,
          message: "apply was removed from the queue before it ran",
        },
      });
      return;
    }

    let saveResult: EnqueueResult;
    try {
      saveResult = await enqueueAndAwait(
        "general.closeAndCloudsave",
        [],
        isCancelRequested
      );
    } catch (err) {
      set({
        status: "idle",
        cancelRequested: false,
        lastOutcome: {
          kind: "error",
          iterations: completedIterations,
          message: err instanceof Error ? err.message : "cloudsave failed",
        },
      });
      return;
    }
    if (saveResult === "cancelled") {
      break;
    }
    if (saveResult === "removed") {
      set({
        status: "idle",
        cancelRequested: false,
        lastOutcome: {
          kind: "error",
          iterations: completedIterations,
          message: "cloudsave was removed from the queue before it ran",
        },
      });
      return;
    }

    try {
      const freshResult = await waitForFreshLastUpdated(
        prevLastUpdated,
        FRESH_DATA_TIMEOUT_MS,
        isCancelRequested
      );
      if (freshResult === "cancelled") {
        break;
      }
    } catch (err) {
      set({
        status: "idle",
        cancelRequested: false,
        lastOutcome: {
          kind: "error",
          iterations: completedIterations,
          message:
            err instanceof Error ? err.message : "wait for fresh data failed",
        },
      });
      return;
    }
    prevLastUpdated = useConnectionStore.getState().lastUpdated;

    completedIterations = i;
  }

  if (isCancelRequested()) {
    set({
      status: "idle",
      cancelRequested: false,
      lastOutcome: { kind: "cancelled", iterations: completedIterations },
    });
    return;
  }

  set({
    status: "idle",
    cancelRequested: false,
    lastOutcome: {
      kind: "completed-cap",
      iterations: completedIterations,
      totalGainPct: improvementPctFor(
        focus,
        startScore,
        lastResult?.score ?? startScore
      ),
    },
  });
};

const initial = {
  status: "idle" as LoopSolveStatus,
  iteration: 0,
  startScore: null,
  lastImprovementPct: null,
  lastOutcome: null,
  cancelRequested: false,
};

export const useLoopSolveStore = create<LoopSolveState>((set, get) => ({
  ...initial,
  start: async (focus: SolverFocus) => {
    if (get().status !== "idle") {
      return;
    }
    await runLoop(focus, set, get);
  },
  stop: async () => {
    if (get().status !== "running") {
      return;
    }
    set({ status: "cancelling", cancelRequested: true });

    try {
      await window.api.script.world3.construction.solverCancel();
    } catch {
      // best-effort
    }

    try {
      const snap = await window.api.state.get("queue");
      const queueSnap = snap as { runningItem: { itemId: string } | null };
      // queue.clear() drops queued items but keeps the running one - we then
      // explicitly remove the running item so its cancellation token fires.
      await window.api.queue.clear();
      if (queueSnap.runningItem) {
        await window.api.queue.remove(queueSnap.runningItem.itemId);
      }
    } catch {
      // best-effort
    }
  },
  clearOutcome: () => set({ lastOutcome: null }),
}));
