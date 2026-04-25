import { getPosition } from "../../../../parsers/construction";
import type {
  ParsedConstructionData,
  Score,
  SolverResult,
  SolverWeights,
} from "../../../../types/construction";
import { getOptimalSteps } from "./construction-steps";
import {
  calculateStateScore,
  cloneInventory,
  getCogKeys,
  getEntry,
  getScoreSum,
  moveCog,
  shuffle,
} from "./construction-utils";
import { solverLogger } from "./solver-logger";

const MIN_RESTARTS_BEFORE_EARLY_STOP = 3;
const MAX_RESTARTS_WITHOUT_IMPROVEMENT = 5;
const PROGRESS_INTERVAL_MS = 500;
const YIELD_INTERVAL_MS = 100;

export type SolverCallbacks = {
  shouldCancel?: () => boolean;
  onProgress?: (progress: {
    bestScore: Score;
    currentScore: Score;
    iter: number;
    iterPerSec: number;
    elapsedMs: number;
    restarts: number;
    improvementPct: number;
  }) => void;
};

type Pair = { slotKey: number; cogKey: number };

const enumerateNeighborhood = (state: ParsedConstructionData): Pair[] => {
  const pairs: Pair[] = [];
  const slotKeys = state.availableSlotKeys;
  const cogKeys = getCogKeys(state);
  for (const slotKey of slotKeys) {
    const slot = getEntry(slotKey, state);
    if (!slot || slot.fixed) {
      continue;
    }
    for (const cogKey of cogKeys) {
      if (cogKey === slotKey) {
        continue;
      }
      const cog = getEntry(cogKey, state);
      if (!cog || cog.fixed) {
        continue;
      }
      if (getPosition(cogKey).location === "build") {
        continue;
      }
      pairs.push({ slotKey, cogKey });
    }
  }
  return pairs;
};

const computeScoreSum = (
  state: ParsedConstructionData,
  weights: SolverWeights
): number => {
  state.score = calculateStateScore(state);
  return state.score
    ? getScoreSum(state.score, weights)
    : Number.NEGATIVE_INFINITY;
};

const findBestImprovingSwap = (
  state: ParsedConstructionData,
  weights: SolverWeights,
  baseScore: number
): { pair: Pair; delta: number } | null => {
  const pairs = enumerateNeighborhood(state);
  let best: { pair: Pair; delta: number } | null = null;
  for (const pair of pairs) {
    moveCog(state, pair.cogKey, pair.slotKey);
    const newScore = computeScoreSum(state, weights);
    const delta = newScore - baseScore;
    moveCog(state, pair.slotKey, pair.cogKey);
    state.score = null;
    if (delta > 0 && (best === null || delta > best.delta)) {
      best = { pair, delta };
    }
  }
  return best;
};

type ProgressCtx = {
  startWallTime: number;
  lastProgressAt: number;
  totalIterations: number;
  restartsCompleted: number;
  initialScore: number;
  globalBestScore: number;
  globalBestState: ParsedConstructionData;
};

const maybeReportProgress = (
  state: ParsedConstructionData,
  callbacks: SolverCallbacks,
  ctx: ProgressCtx
): void => {
  if (!callbacks.onProgress) {
    return;
  }
  const now = Date.now();
  if (now - ctx.lastProgressAt <= PROGRESS_INTERVAL_MS) {
    return;
  }
  if (!(ctx.globalBestState.score && state.score)) {
    return;
  }
  const elapsed = now - ctx.startWallTime;
  const iterPerSec =
    elapsed > 0 ? Math.round((ctx.totalIterations * 1000) / elapsed) : 0;
  const improvementPct =
    ctx.initialScore > 0
      ? ((ctx.globalBestScore - ctx.initialScore) / ctx.initialScore) * 100
      : 0;
  callbacks.onProgress({
    bestScore: ctx.globalBestState.score,
    currentScore: state.score,
    iter: ctx.totalIterations,
    iterPerSec,
    elapsedMs: elapsed,
    restarts: ctx.restartsCompleted,
    improvementPct,
  });
  ctx.lastProgressAt = now;
};

type RunOutcome = {
  bestState: ParsedConstructionData;
  bestScore: number;
  iterations: number;
};

const steepestAscentRun = async (
  initial: ParsedConstructionData,
  weights: SolverWeights,
  shuffleStart: boolean,
  callbacks: SolverCallbacks,
  ctx: ProgressCtx
): Promise<RunOutcome> => {
  const state = cloneInventory(initial);
  if (shuffleStart) {
    shuffle(state);
  }
  let currentScore = computeScoreSum(state, weights);
  let iterations = 0;
  let lastYieldAt = Date.now();

  while (true) {
    if (callbacks.shouldCancel?.()) {
      break;
    }
    if (Date.now() - lastYieldAt > YIELD_INTERVAL_MS) {
      await new Promise((resolve) => setImmediate(resolve));
      lastYieldAt = Date.now();
    }

    const best = findBestImprovingSwap(state, weights, currentScore);
    if (!best) {
      break;
    }

    moveCog(state, best.pair.cogKey, best.pair.slotKey);
    currentScore = computeScoreSum(state, weights);
    iterations++;
    ctx.totalIterations++;

    if (currentScore > ctx.globalBestScore) {
      ctx.globalBestScore = currentScore;
      ctx.globalBestState = cloneInventory(state);
      ctx.globalBestState.score = state.score;
    }

    maybeReportProgress(state, callbacks, ctx);
  }

  state.score = calculateStateScore(state);
  return { bestState: state, bestScore: currentScore, iterations };
};

export const solver = async (
  inventory: ParsedConstructionData,
  weights: SolverWeights,
  solveTime = 1000,
  callbacks: SolverCallbacks = {}
): Promise<SolverResult | null> => {
  if (inventory.flagPose.length === 0) {
    weights = { ...weights, flaggy: 0 };
    if (weights.focus === "flaggy") {
      weights = { ...weights, focus: "exp" };
    }
  }

  const startTime = Date.now();
  const totalCogs = Object.keys(inventory.cogs).length;
  const totalSlots = inventory.availableSlotKeys.length;
  solverLogger.info(
    `Starting steepest-ascent solver - ${totalCogs} cogs, ${totalSlots} slots`
  );

  const initialState = cloneInventory(inventory);
  initialState.score = calculateStateScore(initialState);
  if (!initialState.score) {
    solverLogger.error("Failed to calculate initial score");
    return null;
  }
  const initialScore = getScoreSum(initialState.score, weights);
  solverLogger.info(`Initial score: ${initialScore.toFixed(2)}`);

  const ctx: ProgressCtx = {
    startWallTime: startTime,
    lastProgressAt: startTime,
    totalIterations: 0,
    restartsCompleted: 0,
    initialScore,
    globalBestScore: initialScore,
    globalBestState: initialState,
  };

  let restartsSinceImprovement = 0;
  for (let restart = 0; ; restart++) {
    if (callbacks.shouldCancel?.()) {
      solverLogger.info(`Cancelled after ${restart} restarts`);
      break;
    }
    if (Date.now() - startTime >= solveTime) {
      solverLogger.info(`Time budget reached after ${restart} restarts`);
      break;
    }
    if (
      restart >= MIN_RESTARTS_BEFORE_EARLY_STOP &&
      restartsSinceImprovement >= MAX_RESTARTS_WITHOUT_IMPROVEMENT
    ) {
      solverLogger.info(
        `Early stop - ${restartsSinceImprovement} restarts without improvement (${restart} total)`
      );
      break;
    }

    const shuffleStart = restart > 0;
    const beforeBest = ctx.globalBestScore;
    const result = await steepestAscentRun(
      inventory,
      weights,
      shuffleStart,
      callbacks,
      ctx
    );
    ctx.restartsCompleted++;

    solverLogger.log(
      `Restart ${restart + 1} (${shuffleStart ? "shuffle" : "initial"}) - score=${result.bestScore.toFixed(2)} steps=${result.iterations}`
    );

    if (ctx.globalBestScore > beforeBest) {
      restartsSinceImprovement = 0;
    } else {
      restartsSinceImprovement++;
    }
  }

  const elapsed = Date.now() - startTime;
  const iterPerSec =
    elapsed > 0 ? Math.round((ctx.totalIterations * 1000) / elapsed) : 0;
  const improvement = ctx.globalBestScore - initialScore;
  const improvementPct =
    initialScore > 0 ? (improvement / initialScore) * 100 : 0;
  solverLogger.info(
    `Solver done - ${ctx.restartsCompleted} restarts, ${ctx.totalIterations} iterations in ${elapsed}ms (${iterPerSec}/sec), improvement=${improvement >= 0 ? "+" : ""}${improvement.toFixed(2)} (${improvementPct.toFixed(4)}%)`
  );

  if (!ctx.globalBestState.score) {
    ctx.globalBestState.score = calculateStateScore(ctx.globalBestState);
    if (!ctx.globalBestState.score) {
      solverLogger.error("Failed to calculate final score");
      return null;
    }
  }

  const steps = getOptimalSteps(inventory, ctx.globalBestState, weights);
  return {
    score: ctx.globalBestState.score,
    steps,
  };
};
