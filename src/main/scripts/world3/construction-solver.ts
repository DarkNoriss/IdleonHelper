import {
  calculateScore,
  getPosition,
  INV_COLUMNS,
  SPARE_START,
} from "../../../parsers/construction"
import type {
  ParsedCog,
  ParsedConstructionData,
  Score,
  SolverResult,
  SolverWeights,
} from "../../../types/construction"
import { logger } from "../../utils"
import { getOptimalSteps } from "./construction-steps"

const COOLING_RATE = 0.96
const INITIAL_ACCEPTANCE_RATE = 0.8
const TEMPERATURE_SAMPLES = 100
const MIN_RESTARTS = 1
const RESTART_TIME_MS = 2500
const YIELD_INTERVAL_MS = 100
const COOLING_INTERVAL = 50

export const getKeyFromPosition = (
  location: "board" | "build" | "spare",
  x: number,
  y: number
): number => {
  if (location === "board") {
    return y * INV_COLUMNS + x
  } else if (location === "build") {
    return 96 + y * 3 + x
  } else {
    return SPARE_START + y * 3 + x
  }
}

export const getScoreSum = (score: Score, weights: SolverWeights): number => {
  const expValue = (score.expBonus * (score.expBoost + 10)) / 10 // Assuming 10 players
  const buildRateValue = score.buildRate
  const flaggyValue = (score.flaggy * (score.flagBoost + 4)) / 4

  // Huge multiplier for primary priority (ensures it dominates)
  const PRIMARY_MULTIPLIER = 1e15
  // Small multiplier for secondary priority (tiebreaker)
  const SECONDARY_MULTIPLIER = 1

  let res = 0

  switch (weights.focus) {
    case "exp": {
      // Exp is primary, buildRate is secondary
      res += expValue * PRIMARY_MULTIPLIER
      res += buildRateValue * SECONDARY_MULTIPLIER
      // Flaggy is optional (weight can be 0)
      res += flaggyValue * weights.flaggy
      break
    }
    case "buildRate": {
      // BuildRate is primary, exp is secondary
      res += buildRateValue * PRIMARY_MULTIPLIER
      res += expValue * SECONDARY_MULTIPLIER
      // Flaggy is optional (weight can be 0)
      res += flaggyValue * weights.flaggy
      break
    }
    case "flaggy": {
      // Flaggy is primary, exp is secondary
      res += flaggyValue * PRIMARY_MULTIPLIER
      res += expValue * SECONDARY_MULTIPLIER
      // BuildRate is not considered when focusing flaggy
      break
    }
  }

  return res
}

export const cloneInventory = (
  inventory: ParsedConstructionData
): ParsedConstructionData => {
  const clonedCogs: Record<number, ParsedCog> = {}
  for (const [keyStr, cog] of Object.entries(inventory.cogs)) {
    clonedCogs[Number.parseInt(keyStr, 10)] = { ...cog }
  }

  const clonedSlots: Record<number, ParsedCog> = {}
  for (const [keyStr, slot] of Object.entries(inventory.slots)) {
    clonedSlots[Number.parseInt(keyStr, 10)] = { ...slot }
  }

  return {
    cogs: clonedCogs,
    slots: clonedSlots,
    flagPose: [...inventory.flagPose],
    flaggyShopUpgrades: inventory.flaggyShopUpgrades,
    availableSlotKeys: [...inventory.availableSlotKeys],
    score: null,
  }
}

export const moveCog = (
  inventory: ParsedConstructionData,
  fromKey: number,
  toKey: number
): void => {
  // Get cogs from both cogs and slots (like getEntry does)
  const fromCog = inventory.cogs[fromKey] ?? inventory.slots[fromKey]
  const toCog = inventory.cogs[toKey] ?? inventory.slots[toKey]

  if (!fromCog) {
    return
  }

  // Swap cogs
  const temp = toCog
  if (fromCog) {
    inventory.cogs[toKey] = { ...fromCog, key: toKey }
    // Remove from slots if it was there
    if (inventory.slots[fromKey]) {
      delete inventory.slots[fromKey]
    }
  } else {
    delete inventory.cogs[toKey]
  }

  if (temp) {
    inventory.cogs[fromKey] = { ...temp, key: fromKey }
    // Remove from slots if it was there
    if (inventory.slots[toKey]) {
      delete inventory.slots[toKey]
    }
  } else {
    delete inventory.cogs[fromKey]
  }

  inventory.score = null
}

const getCogKeys = (inventory: ParsedConstructionData): number[] => {
  return Object.keys(inventory.cogs).map((k) => Number.parseInt(k, 10))
}

const getEntry = (
  key: number,
  inventory: ParsedConstructionData
): ParsedCog | undefined => {
  return inventory.cogs[key] ?? inventory.slots[key]
}

export const shuffle = (inventory: ParsedConstructionData, n = 2000): void => {
  const allSlots = inventory.availableSlotKeys
  for (let i = 0; i < n; i++) {
    const slotKey = allSlots[Math.floor(Math.random() * allSlots.length)]
    const allKeys = getCogKeys(inventory)
    const cogKey = allKeys[Math.floor(Math.random() * allKeys.length)]
    const slot = getEntry(slotKey, inventory)
    const cog = getEntry(cogKey, inventory)

    if (!slot || !cog) continue
    if (slot.fixed || cog.fixed) continue

    const cogPosition = getPosition(cogKey)
    if (cogPosition.location === "build") continue

    moveCog(inventory, cogKey, slotKey)
  }
}

export const calculateStateScore = (
  state: ParsedConstructionData
): Score | null => {
  return calculateScore({
    cogs: state.cogs,
    slots: state.slots,
    flagPose: state.flagPose,
    flaggyShopUpgrades: state.flaggyShopUpgrades,
    availableSlotKeys: state.availableSlotKeys,
  })
}

const generateRandomMove = (
  state: ParsedConstructionData
): { cogKey: number; slotKey: number } | null => {
  const allSlots = state.availableSlotKeys
  const allKeys = getCogKeys(state)

  if (allSlots.length === 0 || allKeys.length === 0) return null

  for (let attempt = 0; attempt < 10; attempt++) {
    const slotKey = allSlots[Math.floor(Math.random() * allSlots.length)]
    const cogKey = allKeys[Math.floor(Math.random() * allKeys.length)]
    const slot = getEntry(slotKey, state)
    const cog = getEntry(cogKey, state)

    if (!slot || !cog) continue
    if (slot.fixed || cog.fixed) continue

    const cogPosition = getPosition(cogKey)
    if (cogPosition.location === "build") continue

    return { cogKey, slotKey }
  }

  return null
}

const shouldAcceptMove = (scoreDelta: number, temperature: number): boolean => {
  if (scoreDelta > 0) {
    return true
  }

  if (temperature <= 0) {
    return false
  }

  const acceptanceProbability = Math.exp(scoreDelta / temperature)
  return Math.random() < acceptanceProbability
}

const calculateInitialTemperature = (
  inventory: ParsedConstructionData,
  weights: SolverWeights
): number => {
  const state = cloneInventory(inventory)
  shuffle(state)

  state.score = calculateStateScore(state)
  if (!state.score) return 100

  const baseScore = getScoreSum(state.score, weights)
  const scoreDeltas: number[] = []

  for (let i = 0; i < TEMPERATURE_SAMPLES; i++) {
    const move = generateRandomMove(state)
    if (!move) continue

    const { cogKey, slotKey } = move

    moveCog(state, cogKey, slotKey)
    state.score = calculateStateScore(state)

    if (state.score) {
      const newScore = getScoreSum(state.score, weights)
      const delta = newScore - baseScore
      if (delta < 0) {
        scoreDeltas.push(Math.abs(delta))
      }
    }

    moveCog(state, slotKey, cogKey)
    state.score = calculateStateScore(state)
  }

  if (scoreDeltas.length === 0) {
    return Math.max(baseScore * 0.1, 100)
  }

  const avgDelta = scoreDeltas.reduce((a, b) => a + b, 0) / scoreDeltas.length
  const initialTemp = -avgDelta / Math.log(INITIAL_ACCEPTANCE_RATE)

  return Math.max(initialTemp, 1)
}

const simulatedAnnealingRun = async (
  inventory: ParsedConstructionData,
  weights: SolverWeights,
  timeAllocationMs: number,
  initialTemperature: number,
  startFromShuffle: boolean
): Promise<{
  bestState: ParsedConstructionData
  bestScore: number
  iterations: number
  improvements: number
}> => {
  const state = cloneInventory(inventory)
  if (startFromShuffle) {
    shuffle(state)
  }

  state.score = calculateStateScore(state)
  if (!state.score) {
    return {
      bestState: state,
      bestScore: -Infinity,
      iterations: 0,
      improvements: 0,
    }
  }

  let currentScore = getScoreSum(state.score, weights)
  let bestState = cloneInventory(state)
  let bestScore = currentScore

  const startTime = Date.now()
  let lastYield = Date.now()
  let iterations = 0
  let improvements = 0
  let temperature = initialTemperature

  while (Date.now() - startTime < timeAllocationMs) {
    iterations++

    if (Date.now() - lastYield > YIELD_INTERVAL_MS) {
      await new Promise((resolve) => setImmediate(resolve))
      lastYield = Date.now()
    }

    if (iterations % COOLING_INTERVAL === 0) {
      const progress = (Date.now() - startTime) / timeAllocationMs
      temperature = initialTemperature * Math.pow(COOLING_RATE, progress * 100)
    }

    const move = generateRandomMove(state)
    if (!move) continue

    const { cogKey, slotKey } = move

    moveCog(state, cogKey, slotKey)
    state.score = calculateStateScore(state)

    if (!state.score) {
      moveCog(state, slotKey, cogKey)
      state.score = calculateStateScore(state)
      continue
    }

    const newScore = getScoreSum(state.score, weights)
    const scoreDelta = newScore - currentScore

    if (shouldAcceptMove(scoreDelta, temperature)) {
      currentScore = newScore

      if (scoreDelta > 0) {
        improvements++
      }

      if (currentScore > bestScore) {
        bestScore = currentScore
        bestState = cloneInventory(state)
      }
    } else {
      moveCog(state, slotKey, cogKey)
      state.score = calculateStateScore(state)
    }
  }

  return { bestState, bestScore, iterations, improvements }
}

type Move = {
  fromKey: number
  toKey: number
}

const cogsMatch = (
  a: ParsedCog | undefined,
  b: ParsedCog | undefined
): boolean => {
  if (!a || !b) return false
  return (
    a.buildRate === b.buildRate &&
    a.expBonus === b.expBonus &&
    a.flaggy === b.flaggy &&
    a.isPlayer === b.isPlayer
  )
}

const removeUselessMoves = (
  initial: ParsedConstructionData,
  final: ParsedConstructionData,
  weights: SolverWeights
): ParsedConstructionData => {
  logger.log("Removing useless moves...")

  // Calculate scores
  const initialStateScore = calculateStateScore(initial)
  const finalStateScore = calculateStateScore(final)
  const initialScoreSum = initialStateScore
    ? getScoreSum(initialStateScore, weights)
    : -Infinity
  const finalScoreSum = finalStateScore
    ? getScoreSum(finalStateScore, weights)
    : -Infinity

  if (finalScoreSum > initialScoreSum) {
    logger.log(
      `Final state score (${finalScoreSum.toFixed(2)}) is better than initial (${initialScoreSum.toFixed(2)}), returning final state directly`
    )
    const optimized = cloneInventory(final)
    optimized.score = calculateStateScore(optimized)

    if (!optimized.score) {
      logger.log(
        "Warning: Failed to recalculate score for optimized state, but final state had valid score"
      )
      optimized.score = finalStateScore
    }

    return optimized
  }

  const moves: Move[] = []
  const initialCogs = new Set(Object.keys(initial.cogs).map(Number.parseInt))

  for (const key of initialCogs) {
    const initialCog = initial.cogs[key]
    if (!initialCog) {
      continue
    }

    const finalCogAtKey = final.cogs[key]

    let cogMoved = false
    if (!finalCogAtKey) {
      cogMoved = true
    } else {
      cogMoved =
        initialCog.key !== finalCogAtKey.key ||
        initialCog.buildRate !== finalCogAtKey.buildRate ||
        initialCog.expBonus !== finalCogAtKey.expBonus ||
        initialCog.flaggy !== finalCogAtKey.flaggy ||
        initialCog.isPlayer !== finalCogAtKey.isPlayer
    }

    if (cogMoved) {
      for (const [finalKey, finalCog] of Object.entries(final.cogs)) {
        if (!finalCog) {
          continue
        }

        if (
          initialCog.buildRate === finalCog.buildRate &&
          initialCog.expBonus === finalCog.expBonus &&
          initialCog.flaggy === finalCog.flaggy &&
          initialCog.isPlayer === finalCog.isPlayer
        ) {
          const finalKeyNum = Number.parseInt(finalKey, 10)
          if (key !== finalKeyNum) {
            moves.push({ fromKey: key, toKey: finalKeyNum })
            break
          }
        }
      }
    }
  }

  logger.log(`Found ${moves.length} potential moves`)

  if (finalScoreSum > initialScoreSum && moves.length > 0) {
    const testAllMovesState = cloneInventory(initial)
    for (const move of moves) {
      moveCog(testAllMovesState, move.fromKey, move.toKey)
    }
    testAllMovesState.score = calculateStateScore(testAllMovesState)

    if (testAllMovesState.score) {
      const allMovesScore = getScoreSum(testAllMovesState.score, weights)

      let stateMatches = true
      const mismatches: string[] = []
      const allKeys = new Set([
        ...Object.keys(final.cogs).map((k) => Number.parseInt(k, 10)),
        ...Object.keys(testAllMovesState.cogs).map((k) =>
          Number.parseInt(k, 10)
        ),
      ])

      for (const key of allKeys) {
        const testCog = testAllMovesState.cogs[key]
        const finalCog = final.cogs[key]
        if (!cogsMatch(testCog, finalCog)) {
          stateMatches = false
          const testStr = testCog
            ? `${testCog.buildRate}-${testCog.expBonus}-${testCog.flaggy}`
            : "null"
          const finalStr = finalCog
            ? `${finalCog.buildRate}-${finalCog.expBonus}-${finalCog.flaggy}`
            : "null"
          mismatches.push(`key ${key}: test=[${testStr}], final=[${finalStr}]`)
          if (mismatches.length >= 10) break
        }
      }

      const scoreClose =
        allMovesScore >= finalScoreSum * 0.99 ||
        Math.abs(allMovesScore - finalScoreSum) < Math.abs(finalScoreSum * 0.01)

      if (scoreClose && stateMatches) {
        logger.log(
          `Keeping all ${moves.length} moves: together they produce score ${allMovesScore.toFixed(2)} matching final state (final: ${finalScoreSum.toFixed(2)})`
        )
        testAllMovesState.score = calculateStateScore(testAllMovesState)
        return testAllMovesState
      } else if (scoreClose) {
        logger.log(
          `Warning: All ${moves.length} moves produce score ${allMovesScore.toFixed(2)} close to final ${finalScoreSum.toFixed(2)}, but state doesn't match (${mismatches.length} mismatches). Using all moves anyway.`
        )
        testAllMovesState.score = calculateStateScore(testAllMovesState)
        return testAllMovesState
      } else {
        logger.log(
          `Not keeping all moves: together they produce score ${allMovesScore.toFixed(2)} (final: ${finalScoreSum.toFixed(2)}, difference: ${(finalScoreSum - allMovesScore).toFixed(2)})`
        )
      }
    }
  }

  const usefulMoves: Move[] = []

  for (const move of moves) {
    const testState = cloneInventory(initial)
    testState.score = calculateStateScore(testState)

    if (!testState.score) {
      usefulMoves.push(move)
      continue
    }

    const scoreBefore = getScoreSum(testState.score, weights)

    moveCog(testState, move.fromKey, move.toKey)
    testState.score = calculateStateScore(testState)

    if (!testState.score) {
      usefulMoves.push(move)
      continue
    }

    const scoreAfter = getScoreSum(testState.score, weights)
    const scoreDelta = scoreAfter - scoreBefore

    if (scoreDelta !== 0) {
      usefulMoves.push(move)
    } else {
      logger.log(
        `Removed zero-impact move: ${move.fromKey} -> ${move.toKey} (score unchanged)`
      )
    }
  }

  logger.log(
    `Removed ${moves.length - usefulMoves.length} zero-impact moves, kept ${usefulMoves.length} moves`
  )

  // Apply all useful moves
  const optimized = cloneInventory(initial)
  for (const move of usefulMoves) {
    moveCog(optimized, move.fromKey, move.toKey)
  }

  optimized.score = calculateStateScore(optimized)

  return optimized
}

export const solver = async (
  inventory: ParsedConstructionData,
  weights: SolverWeights,
  solveTime = 1000
): Promise<SolverResult | null> => {
  if (inventory.flagPose.length === 0) {
    weights = { ...weights, flaggy: 0 }
    if (weights.focus === "flaggy") {
      weights = { ...weights, focus: "exp" }
    }
  }

  const startTime = Date.now()
  const totalCogs = Object.keys(inventory.cogs).length
  const totalSlots = inventory.availableSlotKeys.length

  logger.log(
    `Starting simulated annealing solver... (${totalCogs} cogs, ${totalSlots} available slots)`
  )

  const initialState = cloneInventory(inventory)
  initialState.score = calculateStateScore(initialState)

  if (!initialState.score) {
    logger.log("Failed to calculate initial score")
    return null
  }

  const initialScore = getScoreSum(initialState.score, weights)
  logger.log(`Initial score: ${initialScore.toFixed(2)}`)

  const numRestarts = Math.max(
    MIN_RESTARTS,
    Math.floor(solveTime / RESTART_TIME_MS)
  )
  const timePerRestart = Math.floor(solveTime / numRestarts)

  logger.log(
    `Running ${numRestarts} restart(s), ${timePerRestart}ms per restart`
  )

  const initialTemperature = calculateInitialTemperature(inventory, weights)
  logger.log(`Initial temperature: ${initialTemperature.toFixed(2)}`)

  const solutions: {
    state: ParsedConstructionData
    score: number
    iterations: number
    improvements: number
  }[] = []

  solutions.push({
    state: initialState,
    score: initialScore,
    iterations: 0,
    improvements: 0,
  })

  let totalIterations = 0
  let totalImprovements = 0

  for (let restart = 0; restart < numRestarts; restart++) {
    if (Date.now() - startTime >= solveTime) {
      logger.log(`Time limit reached after ${restart} restarts`)
      break
    }

    const elapsed = Date.now() - startTime
    const remainingTime = solveTime - elapsed
    const thisRestartTime = Math.min(timePerRestart, remainingTime)

    if (thisRestartTime < 50) {
      break
    }

    const restartTemp = initialTemperature * (0.8 + Math.random() * 0.4)
    const startFromShuffle = restart > 0

    logger.log(
      `Restart ${restart + 1}/${numRestarts}: ${thisRestartTime}ms, temp=${restartTemp.toFixed(2)}, shuffle=${startFromShuffle}`
    )

    const result = await simulatedAnnealingRun(
      inventory,
      weights,
      thisRestartTime,
      restartTemp,
      startFromShuffle
    )

    totalIterations += result.iterations
    totalImprovements += result.improvements

    solutions.push({
      state: result.bestState,
      score: result.bestScore,
      iterations: result.iterations,
      improvements: result.improvements,
    })

    logger.log(
      `Restart ${restart + 1} complete: score=${result.bestScore.toFixed(2)}, iterations=${result.iterations}, improvements=${result.improvements}`
    )
  }

  const elapsedTime = Date.now() - startTime
  const iterationsPerSecond =
    elapsedTime > 0 ? Math.round(totalIterations / (elapsedTime / 1000)) : 0

  logger.log(
    `Solver stats: ${totalIterations} iterations in ${elapsedTime}ms (${iterationsPerSecond}/sec), ${totalImprovements} improvements, ${solutions.length} solutions`
  )

  // Find best solution across all restarts
  let bestSolution = solutions[0]
  for (const solution of solutions) {
    if (solution.score > bestSolution.score) {
      bestSolution = solution
    }
  }

  if (!bestSolution || bestSolution.score === -Infinity) {
    logger.log("No valid solution found")
    return null
  }

  const improvement = bestSolution.score - initialScore
  logger.log(
    `Best score: ${bestSolution.score.toFixed(2)} (improvement: ${improvement >= 0 ? "+" : ""}${improvement.toFixed(2)})`
  )

  // Ensure best solution state has a score calculated
  if (!bestSolution.state.score) {
    bestSolution.state.score = calculateStateScore(bestSolution.state)
    if (!bestSolution.state.score) {
      logger.log("Failed to calculate best solution score")
      return null
    }
  }

  const initialScoreObj = initialState.score!
  const bestScoreObj = bestSolution.state.score!
  const initialBuildRateScore = initialScoreObj.buildRate
  const initialExpScore =
    (initialScoreObj.expBonus * (initialScoreObj.expBoost + 10)) / 10
  const initialFlaggyScore =
    (initialScoreObj.flaggy * (initialScoreObj.flagBoost + 4)) / 4
  const bestBuildRateScore = bestScoreObj.buildRate
  const bestExpScore =
    (bestScoreObj.expBonus * (bestScoreObj.expBoost + 10)) / 10
  const bestFlaggyScore =
    (bestScoreObj.flaggy * (bestScoreObj.flagBoost + 4)) / 4

  logger.log(`Weights: focus=${weights.focus}, flaggy=${weights.flaggy}`)
  logger.log(
    `Initial score breakdown: total=${initialScore.toFixed(2)}, buildRate=${initialBuildRateScore.toFixed(2)}, exp=${initialExpScore.toFixed(2)}, flaggy=${initialFlaggyScore.toFixed(2)}`
  )
  logger.log(
    `Best score breakdown: total=${bestSolution.score.toFixed(2)}, buildRate=${bestBuildRateScore.toFixed(2)}, exp=${bestExpScore.toFixed(2)}, flaggy=${bestFlaggyScore.toFixed(2)}`
  )
  logger.log(
    `Score improvements: buildRate=${(bestBuildRateScore - initialBuildRateScore).toFixed(2)}, exp=${(bestExpScore - initialExpScore).toFixed(2)}, flaggy=${(bestFlaggyScore - initialFlaggyScore).toFixed(2)}`
  )

  logger.log("Solver optimization completed, processing results...")

  const optimized = removeUselessMoves(inventory, bestSolution.state, weights)
  const steps = getOptimalSteps(inventory, optimized, weights)

  const verifyStateFromSteps = cloneInventory(inventory)
  for (const step of steps) {
    const fromKey = getKeyFromPosition(
      step.from.location,
      step.from.x,
      step.from.y
    )
    const toKey = getKeyFromPosition(step.to.location, step.to.x, step.to.y)
    moveCog(verifyStateFromSteps, fromKey, toKey)
  }
  verifyStateFromSteps.score = calculateStateScore(verifyStateFromSteps)

  if (verifyStateFromSteps.score && optimized.score) {
    const verifyScoreSum = getScoreSum(verifyStateFromSteps.score, weights)
    const optimizedScoreSum = getScoreSum(optimized.score, weights)
    const scoreMatches = verifyScoreSum === optimizedScoreSum

    if (!scoreMatches) {
      logger.log(
        `Warning: Steps produce score ${verifyScoreSum.toFixed(2)} but expected ${optimizedScoreSum.toFixed(2)}`
      )
    } else {
      logger.log(
        `Steps verified: applying steps to initial inventory produces score ${verifyScoreSum.toFixed(2)} matching optimized score`
      )
    }
  }

  if (!optimized.score) {
    logger.log("Failed to calculate optimized score")
    return null
  }

  const optimizedScoreSum = getScoreSum(optimized.score, weights)
  const optimizedScoreObj = optimized.score
  const optimizedBuildRateScore = optimizedScoreObj.buildRate
  const optimizedExpScore =
    (optimizedScoreObj.expBonus * (optimizedScoreObj.expBoost + 10)) / 10
  const optimizedFlaggyScore =
    (optimizedScoreObj.flaggy * (optimizedScoreObj.flagBoost + 4)) / 4

  logger.log(
    `Optimized score breakdown: total=${optimizedScoreSum.toFixed(2)}, buildRate=${optimizedBuildRateScore.toFixed(2)}, exp=${optimizedExpScore.toFixed(2)}, flaggy=${optimizedFlaggyScore.toFixed(2)}`
  )
  logger.log(
    `Score change from best: ${(optimizedScoreSum - bestSolution.score).toFixed(2)}`
  )
  logger.log(
    `Score change from initial: ${(optimizedScoreSum - initialScore).toFixed(2)}`
  )
  logger.log(
    `Component changes from best: buildRate=${(optimizedBuildRateScore - bestBuildRateScore).toFixed(2)}, exp=${(optimizedExpScore - bestExpScore).toFixed(2)}, flaggy=${(optimizedFlaggyScore - bestFlaggyScore).toFixed(2)}`
  )

  return {
    score: optimized.score,
    steps,
  }
}
