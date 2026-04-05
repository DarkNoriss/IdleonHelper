import { getPosition } from "../../../parsers/construction.ts";
import type {
  ParsedCog,
  ParsedConstructionData,
  SolverResult,
  SolverWeights,
} from "../../../types/construction.ts";
import { logger } from "../../utils/index.ts";
import { getOptimalSteps } from "./construction-steps.ts";
import {
  calculateStateScore,
  cloneInventory,
  getCogKeys,
  getEntry,
  getKeyFromPosition,
  getScoreSum,
  moveCog,
  shuffle,
} from "./construction-utils.ts";

const COOLING_RATE = 0.96;
const INITIAL_ACCEPTANCE_RATE = 0.8;
const TEMPERATURE_SAMPLES = 200;
const MIN_RESTARTS = 2;
const RESTART_TIME_MS = 10_000; // 10 seconds per restart - allows proper exploration
const YIELD_INTERVAL_MS = 100;
const COOLING_INTERVAL = 50;
const EARLY_TERMINATION_THRESHOLD = 0.35; // Stop if no improvement for 35% of time (~3.5s per restart)

type ValidMove = {
  cogKey: number;
  slotKey: number;
};

const getValidMoves = (state: ParsedConstructionData): ValidMove[] => {
  const validMoves: ValidMove[] = [];
  const allSlots = state.availableSlotKeys;
  const allKeys = getCogKeys(state);

  if (allSlots.length === 0 || allKeys.length === 0) {
    return validMoves;
  }

  for (const slotKey of allSlots) {
    const slot = getEntry(slotKey, state);
    if (!slot || slot.fixed) {
      continue;
    }

    for (const cogKey of allKeys) {
      const cog = getEntry(cogKey, state);
      if (!cog || cog.fixed) {
        continue;
      }

      const cogPosition = getPosition(cogKey);
      if (cogPosition.location === "build") {
        continue;
      }

      validMoves.push({ cogKey, slotKey });
    }
  }

  return validMoves;
};

const generateRandomMove = (
  state: ParsedConstructionData,
  validMovesCache?: ValidMove[]
): { cogKey: number; slotKey: number } | null => {
  const validMoves = validMovesCache ?? getValidMoves(state);

  if (validMoves.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * validMoves.length);
  return validMoves[randomIndex]!;
};

const shouldAcceptMove = (
  scoreDelta: number,
  temperature: number,
  currentScore: number
): boolean => {
  if (scoreDelta > 0) {
    return true;
  }

  if (temperature <= 0) {
    return false;
  }

  // Use relative temperature: normalize by current score magnitude
  // This prevents issues with huge absolute score values
  const relativeDelta =
    currentScore > 0 ? scoreDelta / currentScore : scoreDelta;
  const relativeTemp =
    currentScore > 0 ? temperature / currentScore : temperature;

  // Clamp to reasonable range to avoid numerical issues
  const normalizedDelta = Math.max(relativeDelta, -100);
  const normalizedTemp = Math.max(relativeTemp, 1e-10);

  const acceptanceProbability = Math.exp(normalizedDelta / normalizedTemp);
  return Math.random() < acceptanceProbability;
};

const calculateInitialTemperature = (
  inventory: ParsedConstructionData,
  weights: SolverWeights
): number => {
  const state = cloneInventory(inventory);
  shuffle(state);

  state.score = calculateStateScore(state);
  if (!state.score) {
    return 0.1;
  }

  const baseScore = getScoreSum(state.score, weights);
  if (baseScore <= 0) {
    return 0.1;
  }

  // Collect relative score deltas (normalized by base score)
  const relativeDeltas: number[] = [];

  // Pre-compute valid moves for efficiency
  const validMovesCache = getValidMoves(state);

  for (let i = 0; i < TEMPERATURE_SAMPLES; i++) {
    const move = generateRandomMove(state, validMovesCache);
    if (!move) {
      continue;
    }

    const { cogKey, slotKey } = move;

    moveCog(state, cogKey, slotKey);
    state.score = calculateStateScore(state);

    if (state.score) {
      const newScore = getScoreSum(state.score, weights);
      const delta = newScore - baseScore;
      if (delta < 0) {
        // Store relative delta (as percentage of base score)
        const relativeDelta = Math.abs(delta / baseScore);
        relativeDeltas.push(relativeDelta);
      }
    }

    moveCog(state, slotKey, cogKey);
    state.score = calculateStateScore(state);
  }

  if (relativeDeltas.length === 0) {
    // Default to 5% of base score as temperature
    return baseScore * 0.05;
  }

  // Use 75th percentile for better temperature estimation
  relativeDeltas.sort((a, b) => a - b);
  const percentileIndex = Math.floor(relativeDeltas.length * 0.75);
  const percentileRelativeDelta =
    relativeDeltas[percentileIndex] ?? relativeDeltas.at(-1) ?? 0.01;

  // Temperature should be relative to base score
  // Formula: temp = -relativeDelta / ln(acceptance_rate)
  // This gives us a temperature that's a fraction of the base score
  const initialTemp =
    (baseScore * percentileRelativeDelta) / -Math.log(INITIAL_ACCEPTANCE_RATE);

  // Ensure temperature is reasonable (between 0.01% and 10% of base score)
  const minTemp = baseScore * 0.0001;
  const maxTemp = baseScore * 0.1;
  return Math.max(minTemp, Math.min(maxTemp, initialTemp));
};

const simulatedAnnealingRun = async (
  inventory: ParsedConstructionData,
  weights: SolverWeights,
  timeAllocationMs: number,
  initialTemperature: number,
  startFromShuffle: boolean
): Promise<{
  bestState: ParsedConstructionData;
  bestScore: number;
  iterations: number;
  improvements: number;
}> => {
  const state = cloneInventory(inventory);
  if (startFromShuffle) {
    shuffle(state);
  }

  state.score = calculateStateScore(state);
  if (!state.score) {
    return {
      bestState: state,
      bestScore: Number.NEGATIVE_INFINITY,
      iterations: 0,
      improvements: 0,
    };
  }

  let currentScore = getScoreSum(state.score, weights);
  let bestState = cloneInventory(state);
  let bestScore = currentScore;

  // Pre-compute valid moves once for efficiency
  const validMovesCache = getValidMoves(state);
  if (validMovesCache.length === 0) {
    logger.log("No valid moves available");
    return { bestState, bestScore, iterations: 0, improvements: 0 };
  }

  const startTime = Date.now();
  let lastYield = Date.now();
  let iterations = 0;
  let improvements = 0;
  let temperature = initialTemperature;
  let lastImprovementTime = startTime;
  const earlyTerminationTime = timeAllocationMs * EARLY_TERMINATION_THRESHOLD;

  while (Date.now() - startTime < timeAllocationMs) {
    iterations++;

    // Early termination: stop if no improvements for threshold % of time
    if (Date.now() - lastImprovementTime > earlyTerminationTime) {
      logger.log(
        `Early termination: no improvements for ${Math.round((Date.now() - lastImprovementTime) / 1000)}s (${Math.round(earlyTerminationTime / 1000)}s threshold)`
      );
      break;
    }

    if (Date.now() - lastYield > YIELD_INTERVAL_MS) {
      await new Promise((resolve) => setImmediate(resolve));
      lastYield = Date.now();
    }

    if (iterations % COOLING_INTERVAL === 0) {
      const progress = (Date.now() - startTime) / timeAllocationMs;
      // Exponential cooling: temperature decreases as we progress
      // Use a more gradual cooling curve
      const coolingSteps = Math.floor(progress * 100);
      temperature = initialTemperature * COOLING_RATE ** coolingSteps;

      // Ensure temperature doesn't go below a minimum threshold
      // (relative to current score to maintain exploration)
      const minTemp = currentScore > 0 ? currentScore * 1e-6 : 1e-10;
      temperature = Math.max(temperature, minTemp);
    }

    const move = generateRandomMove(state, validMovesCache);
    if (!move) {
      continue;
    }

    const { cogKey, slotKey } = move;

    moveCog(state, cogKey, slotKey);
    state.score = calculateStateScore(state);

    if (!state.score) {
      moveCog(state, slotKey, cogKey);
      state.score = calculateStateScore(state);
      continue;
    }

    const newScore = getScoreSum(state.score, weights);
    const scoreDelta = newScore - currentScore;

    if (shouldAcceptMove(scoreDelta, temperature, currentScore)) {
      currentScore = newScore;

      if (scoreDelta > 0) {
        improvements++;
        lastImprovementTime = Date.now();
      }

      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestState = cloneInventory(state);
        lastImprovementTime = Date.now();
      }
    } else {
      // Revert the move - we rejected it
      moveCog(state, slotKey, cogKey);
      state.score = calculateStateScore(state);
    }
  }

  // Log detailed stats for this annealing run
  if (bestState.score) {
    const expValue = bestState.score.playerExpRate || 0;
    const improvementRate =
      iterations > 0 ? ((improvements / iterations) * 100).toFixed(2) : "0.00";
    const finalTemp = temperature > 0 ? temperature.toFixed(2) : "0.00";
    logger.log(
      `Annealing run complete: iterations=${iterations}, improvements=${improvements} (${improvementRate}%), final_temp=${finalTemp}, exp=${expValue.toFixed(2)}`
    );
  }

  return { bestState, bestScore, iterations, improvements };
};

type Move = {
  fromKey: number;
  toKey: number;
};

const cogsMatch = (
  a: ParsedCog | undefined,
  b: ParsedCog | undefined
): boolean => {
  if (!(a && b)) {
    return false;
  }
  return (
    a.buildRate === b.buildRate &&
    a.expBonus === b.expBonus &&
    a.flaggy === b.flaggy &&
    a.isPlayer === b.isPlayer
  );
};

const removeUselessMoves = (
  initial: ParsedConstructionData,
  final: ParsedConstructionData,
  weights: SolverWeights
): ParsedConstructionData => {
  // Calculate scores
  const initialStateScore = calculateStateScore(initial);
  const finalStateScore = calculateStateScore(final);
  const initialScoreSum = initialStateScore
    ? getScoreSum(initialStateScore, weights)
    : Number.NEGATIVE_INFINITY;
  const finalScoreSum = finalStateScore
    ? getScoreSum(finalStateScore, weights)
    : Number.NEGATIVE_INFINITY;

  if (finalScoreSum > initialScoreSum) {
    logger.log(
      `Final state score (${finalScoreSum.toFixed(2)}) is better than initial (${initialScoreSum.toFixed(2)}), returning final state directly`
    );
    const optimized = cloneInventory(final);
    optimized.score = calculateStateScore(optimized);

    if (!optimized.score) {
      logger.log(
        "Warning: Failed to recalculate score for optimized state, but final state had valid score"
      );
      optimized.score = finalStateScore;
    }

    return optimized;
  }

  const moves: Move[] = [];
  const initialCogs = new Set(Object.keys(initial.cogs).map(Number.parseInt));
  const finalCogs = new Set(Object.keys(final.cogs).map(Number.parseInt));

  logger.log(
    `Comparing states: initial has ${initialCogs.size} cogs, final has ${finalCogs.size} cogs`
  );

  for (const key of initialCogs) {
    const initialCog = initial.cogs[key];
    if (!initialCog) {
      continue;
    }

    const finalCogAtKey = final.cogs[key];

    let cogMoved = false;
    if (finalCogAtKey) {
      cogMoved =
        initialCog.key !== finalCogAtKey.key ||
        initialCog.buildRate !== finalCogAtKey.buildRate ||
        initialCog.expBonus !== finalCogAtKey.expBonus ||
        initialCog.flaggy !== finalCogAtKey.flaggy ||
        initialCog.isPlayer !== finalCogAtKey.isPlayer;
    } else {
      cogMoved = true;
    }

    if (cogMoved) {
      for (const [finalKey, finalCog] of Object.entries(final.cogs)) {
        if (!finalCog) {
          continue;
        }

        if (
          initialCog.buildRate === finalCog.buildRate &&
          initialCog.expBonus === finalCog.expBonus &&
          initialCog.flaggy === finalCog.flaggy &&
          initialCog.isPlayer === finalCog.isPlayer
        ) {
          const finalKeyNum = Number.parseInt(finalKey, 10);
          if (key !== finalKeyNum) {
            moves.push({ fromKey: key, toKey: finalKeyNum });
            break;
          }
        }
      }
    }
  }

  if (finalScoreSum > initialScoreSum && moves.length > 0) {
    const testAllMovesState = cloneInventory(initial);
    for (const move of moves) {
      moveCog(testAllMovesState, move.fromKey, move.toKey);
    }
    testAllMovesState.score = calculateStateScore(testAllMovesState);

    if (testAllMovesState.score) {
      const allMovesScore = getScoreSum(testAllMovesState.score, weights);

      let stateMatches = true;
      const mismatches: string[] = [];
      const allKeys = new Set([
        ...Object.keys(final.cogs).map((k) => Number.parseInt(k, 10)),
        ...Object.keys(testAllMovesState.cogs).map((k) =>
          Number.parseInt(k, 10)
        ),
      ]);

      for (const key of allKeys) {
        const testCog = testAllMovesState.cogs[key];
        const finalCog = final.cogs[key];
        if (!cogsMatch(testCog, finalCog)) {
          stateMatches = false;
          const testStr = testCog
            ? `${testCog.buildRate}-${testCog.expBonus}-${testCog.flaggy}`
            : "null";
          const finalStr = finalCog
            ? `${finalCog.buildRate}-${finalCog.expBonus}-${finalCog.flaggy}`
            : "null";
          mismatches.push(`key ${key}: test=[${testStr}], final=[${finalStr}]`);
          if (mismatches.length >= 10) {
            break;
          }
        }
      }

      const scoreClose =
        allMovesScore >= finalScoreSum * 0.99 ||
        Math.abs(allMovesScore - finalScoreSum) <
          Math.abs(finalScoreSum * 0.01);

      if (scoreClose && stateMatches) {
        logger.log(
          `Keeping all ${moves.length} moves: together they produce score ${allMovesScore.toFixed(2)} matching final state (final: ${finalScoreSum.toFixed(2)})`
        );
        testAllMovesState.score = calculateStateScore(testAllMovesState);
        return testAllMovesState;
      }
      if (scoreClose) {
        logger.log(
          `Warning: All ${moves.length} moves produce score ${allMovesScore.toFixed(2)} close to final ${finalScoreSum.toFixed(2)}, but state doesn't match (${mismatches.length} mismatches). Using all moves anyway.`
        );
        testAllMovesState.score = calculateStateScore(testAllMovesState);
        return testAllMovesState;
      }
      logger.log(
        `Not keeping all moves: together they produce score ${allMovesScore.toFixed(2)} (final: ${finalScoreSum.toFixed(2)}, difference: ${(finalScoreSum - allMovesScore).toFixed(2)})`
      );
    }
  }

  const usefulMoves: Move[] = [];

  for (const move of moves) {
    const testState = cloneInventory(initial);
    testState.score = calculateStateScore(testState);

    if (!testState.score) {
      usefulMoves.push(move);
      continue;
    }

    const scoreBefore = getScoreSum(testState.score, weights);

    moveCog(testState, move.fromKey, move.toKey);
    testState.score = calculateStateScore(testState);

    if (!testState.score) {
      usefulMoves.push(move);
      continue;
    }

    const scoreAfter = getScoreSum(testState.score, weights);
    const scoreDelta = scoreAfter - scoreBefore;

    if (scoreDelta !== 0) {
      usefulMoves.push(move);
    }
  }

  if (moves.length === 0) {
    logger.log(
      "No moves found between initial and final states (states appear identical)"
    );
  } else {
    logger.log(
      `Removed ${moves.length - usefulMoves.length} zero-impact moves, kept ${usefulMoves.length} moves`
    );
  }

  // Apply all useful moves
  const optimized = cloneInventory(initial);
  for (const move of usefulMoves) {
    moveCog(optimized, move.fromKey, move.toKey);
  }

  optimized.score = calculateStateScore(optimized);

  return optimized;
};

export const solver = async (
  inventory: ParsedConstructionData,
  weights: SolverWeights,
  solveTime = 1000
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

  logger.log(
    `Starting simulated annealing solver... (${totalCogs} cogs, ${totalSlots} available slots)`
  );

  const initialState = cloneInventory(inventory);
  initialState.score = calculateStateScore(initialState);

  if (!initialState.score) {
    logger.log("Failed to calculate initial score");
    return null;
  }

  const initialScore = getScoreSum(initialState.score, weights);
  logger.log(`Initial score: ${initialScore.toFixed(2)}`);

  const numRestarts = Math.max(
    MIN_RESTARTS,
    Math.floor(solveTime / RESTART_TIME_MS)
  );
  const baseTimePerRestart = Math.floor(solveTime / numRestarts);

  logger.log(
    `Running ${numRestarts} restart(s), base time ${baseTimePerRestart}ms per restart`
  );

  const initialTemperature = calculateInitialTemperature(inventory, weights);
  const tempAsPercent =
    initialScore > 0
      ? ((initialTemperature / initialScore) * 100).toFixed(4)
      : "N/A";
  logger.log(
    `Initial temperature: ${initialTemperature.toExponential(2)} (${tempAsPercent}% of initial score)`
  );

  const solutions: {
    state: ParsedConstructionData;
    score: number;
    iterations: number;
    improvements: number;
  }[] = [];

  solutions.push({
    state: initialState,
    score: initialScore,
    iterations: 0,
    improvements: 0,
  });

  let totalIterations = 0;
  let totalImprovements = 0;
  let bestScoreSoFar = initialScore;
  let restartsWithoutImprovement = 0;
  // Adaptive early termination: scale with solve time and number of restarts
  // For longer solve times, require more restarts without improvement
  const minRestartsBeforeEarlyTerm = Math.max(
    MIN_RESTARTS,
    Math.min(5, Math.floor(numRestarts * 0.1))
  );
  const maxRestartsWithoutImprovement = Math.max(
    3,
    Math.min(10, Math.floor(numRestarts * 0.15))
  );

  for (let restart = 0; restart < numRestarts; restart++) {
    if (Date.now() - startTime >= solveTime) {
      logger.log(`Time limit reached after ${restart} restarts`);
      break;
    }

    // Early termination: stop if best solution hasn't improved across multiple restarts
    // Only trigger after minimum restarts and if we've had enough restarts without improvement
    if (
      restart >= minRestartsBeforeEarlyTerm &&
      restartsWithoutImprovement >= maxRestartsWithoutImprovement
    ) {
      logger.log(
        `Early termination: best solution hasn't improved for ${restartsWithoutImprovement} consecutive restarts (after ${restart} total restarts)`
      );
      break;
    }

    const elapsed = Date.now() - startTime;
    const remainingTime = solveTime - elapsed;

    // Adaptive time allocation: give more time to promising restarts
    let thisRestartTime = baseTimePerRestart;
    if (restart > 0 && solutions.length > 1) {
      const lastResult = solutions.at(-1)!;
      const improvementRate =
        lastResult.iterations > 0
          ? lastResult.improvements / lastResult.iterations
          : 0;

      // If last restart had good improvement rate, allocate more time
      if (improvementRate > 0.1) {
        thisRestartTime = Math.floor(baseTimePerRestart * 1.5);
      }
    }

    thisRestartTime = Math.min(thisRestartTime, remainingTime);

    if (thisRestartTime < 50) {
      break;
    }

    // Vary restart temperature between 80% and 120% of initial
    // This provides diversity while staying in reasonable range
    const restartTemp = initialTemperature * (0.8 + Math.random() * 0.4);
    const startFromShuffle = restart > 0;
    const tempAsPercent =
      initialScore > 0
        ? ((restartTemp / initialScore) * 100).toFixed(4)
        : "N/A";

    logger.log(
      `Restart ${restart + 1}/${numRestarts}: ${thisRestartTime}ms, temp=${restartTemp.toExponential(2)} (${tempAsPercent}% of initial score), shuffle=${startFromShuffle}`
    );

    const result = await simulatedAnnealingRun(
      inventory,
      weights,
      thisRestartTime,
      restartTemp,
      startFromShuffle
    );

    totalIterations += result.iterations;
    totalImprovements += result.improvements;

    solutions.push({
      state: result.bestState,
      score: result.bestScore,
      iterations: result.iterations,
      improvements: result.improvements,
    });

    // Track if best solution improved
    if (result.bestScore > bestScoreSoFar) {
      bestScoreSoFar = result.bestScore;
      restartsWithoutImprovement = 0;
    } else {
      restartsWithoutImprovement++;
    }

    logger.log(
      `Restart ${restart + 1} complete: score=${result.bestScore.toFixed(2)}, iterations=${result.iterations}, improvements=${result.improvements}`
    );
  }

  const elapsedTime = Date.now() - startTime;
  const iterationsPerSecond =
    elapsedTime > 0 ? Math.round(totalIterations / (elapsedTime / 1000)) : 0;

  logger.log(
    `Solver stats: ${totalIterations} iterations in ${elapsedTime}ms (${iterationsPerSecond}/sec), ${totalImprovements} improvements, ${solutions.length} solutions`
  );

  // Find best solution across all restarts
  let bestSolution = solutions[0]!;
  let bestSolutionIndex = 0;
  for (let i = 0; i < solutions.length; i++) {
    const solution = solutions[i]!;
    if (solution.score > bestSolution.score) {
      bestSolution = solution;
      bestSolutionIndex = i;
    }
  }
  logger.log(
    `Selected solution from restart ${bestSolutionIndex}/${solutions.length - 1}${bestSolutionIndex === 0 ? " (initial state)" : ""}`
  );

  if (!bestSolution || bestSolution.score === Number.NEGATIVE_INFINITY) {
    logger.log("No valid solution found");
    return null;
  }

  // Check if initial state appears optimal
  const isInitialState = bestSolutionIndex === 0;
  const improvement = bestSolution.score - initialScore;
  const improvementPercent =
    initialScore > 0 ? ((improvement / initialScore) * 100).toFixed(4) : "N/A";

  // Count how many solutions were worse, same, or better
  let worseCount = 0;
  let sameCount = 0;
  let betterCount = 0;
  for (const solution of solutions) {
    if (solution.score < initialScore) {
      worseCount++;
    } else if (solution.score === initialScore) {
      sameCount++;
    } else {
      betterCount++;
    }
  }

  logger.log(
    `Best score: ${bestSolution.score.toFixed(2)} (improvement: ${improvement >= 0 ? "+" : ""}${improvement.toFixed(2)}, ${improvementPercent}%)`
  );

  if (isInitialState && improvement === 0) {
    logger.log(
      `Note: Initial state appears optimal. Explored ${solutions.length - 1} restarts with ${totalIterations} iterations: ${betterCount} better, ${sameCount - 1} same, ${worseCount} worse.`
    );
    if (betterCount === 0 && worseCount > 0) {
      logger.log(
        "All explored states were worse or equal to initial state - configuration may already be at maximum optimization."
      );
    }
  }

  // Ensure best solution state has a score calculated
  if (!bestSolution.state.score) {
    bestSolution.state.score = calculateStateScore(bestSolution.state);
    if (!bestSolution.state.score) {
      logger.log("Failed to calculate best solution score");
      return null;
    }
  }

  const optimized = removeUselessMoves(inventory, bestSolution.state, weights);
  const steps = getOptimalSteps(inventory, optimized, weights);

  const verifyStateFromSteps = cloneInventory(inventory);
  for (const step of steps) {
    const fromKey = getKeyFromPosition(
      step.from.location,
      step.from.x,
      step.from.y
    );
    const toKey = getKeyFromPosition(step.to.location, step.to.x, step.to.y);
    moveCog(verifyStateFromSteps, fromKey, toKey);
  }
  verifyStateFromSteps.score = calculateStateScore(verifyStateFromSteps);

  if (verifyStateFromSteps.score && optimized.score) {
    const verifyScoreSum = getScoreSum(verifyStateFromSteps.score, weights);
    const optimizedScoreSum = getScoreSum(optimized.score, weights);
    const scoreMatches = verifyScoreSum === optimizedScoreSum;

    if (!scoreMatches) {
      logger.log(
        `Warning: Steps produce score ${verifyScoreSum.toFixed(2)} but expected ${optimizedScoreSum.toFixed(2)}`
      );
    }
  }

  if (!optimized.score) {
    logger.log("Failed to calculate optimized score");
    return null;
  }

  const optimizedScoreSum = getScoreSum(optimized.score, weights);

  logger.log(
    `Optimized score: ${optimizedScoreSum.toFixed(2)} (change from initial: ${(optimizedScoreSum - initialScore).toFixed(2)})`
  );

  return {
    score: optimized.score,
    steps,
  };
};
