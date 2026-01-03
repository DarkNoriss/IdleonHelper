import {
  calculateScore,
  getPosition,
  INV_COLUMNS,
  SPARE_START,
} from "../../../parsers/construction"
import type {
  OptimalStep,
  ParsedCog,
  ParsedConstructionData,
  Score,
  SolverResult,
  SolverWeights,
} from "../../../types/construction"
import { logger } from "../../utils"

const getKeyFromPosition = (
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

const getScoreSum = (score: Score, weights: SolverWeights): number => {
  let res = 0
  res += score.buildRate * weights.buildRate
  res += (score.expBonus * weights.exp * (score.expBoost + 10)) / 10 // Assuming 10 players
  res += (score.flaggy * weights.flaggy * (score.flagBoost + 4)) / 4
  return res
}

const cloneInventory = (
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
    score: null, // Will be recalculated
  }
}

const moveCog = (
  inventory: ParsedConstructionData,
  fromKey: number,
  toKey: number
): void => {
  const temp = inventory.cogs[toKey]
  inventory.cogs[toKey] = inventory.cogs[fromKey]

  if (!inventory.cogs[toKey]) {
    delete inventory.cogs[toKey]
  } else {
    inventory.cogs[toKey] = { ...inventory.cogs[toKey], key: toKey }
  }

  inventory.cogs[fromKey] = temp
  if (!inventory.cogs[fromKey]) {
    delete inventory.cogs[fromKey]
  } else {
    inventory.cogs[fromKey] = { ...inventory.cogs[fromKey], key: fromKey }
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

type Move = {
  fromKey: number
  toKey: number
}

const removeUselessMoves = (
  initial: ParsedConstructionData,
  final: ParsedConstructionData,
  weights: SolverWeights
): ParsedConstructionData => {
  logger.log("Removing useless moves...")

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

  const usefulMoves: Move[] = []

  for (const move of moves) {
    const testState = cloneInventory(initial)

    testState.score = calculateScore({
      cogs: testState.cogs,
      slots: testState.slots,
      flagPose: testState.flagPose,
      flaggyShopUpgrades: testState.flaggyShopUpgrades,
      availableSlotKeys: testState.availableSlotKeys,
    })

    if (!testState.score) {
      logger.log(
        `Removed useless move: ${move.fromKey} -> ${move.toKey} (initial score calculation failed)`
      )
      continue
    }

    const scoreBefore = getScoreSum(testState.score, weights)

    moveCog(testState, move.fromKey, move.toKey)

    testState.score = calculateScore({
      cogs: testState.cogs,
      slots: testState.slots,
      flagPose: testState.flagPose,
      flaggyShopUpgrades: testState.flaggyShopUpgrades,
      availableSlotKeys: testState.availableSlotKeys,
    })

    if (!testState.score) {
      logger.log(
        `Removed useless move: ${move.fromKey} -> ${move.toKey} (score calculation failed)`
      )
      continue
    }

    const scoreAfter = getScoreSum(testState.score, weights)

    if (scoreAfter > scoreBefore) {
      usefulMoves.push(move)
    } else {
      logger.log(
        `Removed useless move: ${move.fromKey} -> ${move.toKey} (score: ${scoreBefore} -> ${scoreAfter}, no improvement)`
      )
    }
  }

  logger.log(
    `Removed ${moves.length - usefulMoves.length} useless moves, kept ${usefulMoves.length} useful moves`
  )

  const optimized = cloneInventory(initial)
  for (const move of usefulMoves) {
    moveCog(optimized, move.fromKey, move.toKey)
  }

  optimized.score = calculateScore({
    cogs: optimized.cogs,
    slots: optimized.slots,
    flagPose: optimized.flagPose,
    flaggyShopUpgrades: optimized.flaggyShopUpgrades,
    availableSlotKeys: optimized.availableSlotKeys,
  })

  return optimized
}

/** Checks if two cogs have the same properties (identity match) */
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

/**
 * Calculates the minimal swap steps to transform initial state into final state.
 * Since moveCog is a swap operation, we track state changes after each swap.
 */
const getOptimalSteps = (
  initial: ParsedConstructionData,
  final: ParsedConstructionData
): OptimalStep[] => {
  logger.log("Calculating optimal steps...")

  const steps: OptimalStep[] = []
  const currentState = cloneInventory(initial)

  // Process each position that needs a specific cog in the final state
  for (const [targetKeyStr, finalCog] of Object.entries(final.cogs)) {
    const targetKey = Number.parseInt(targetKeyStr, 10)
    if (!finalCog) continue

    const currentCogAtTarget = currentState.cogs[targetKey]

    // Skip if the correct cog is already at this position
    if (cogsMatch(currentCogAtTarget, finalCog)) {
      continue
    }

    // Find where the required cog currently is in our working state
    let sourceKey: number | null = null
    for (const [srcKeyStr, srcCog] of Object.entries(currentState.cogs)) {
      if (cogsMatch(srcCog, finalCog)) {
        const srcKey = Number.parseInt(srcKeyStr, 10)
        if (srcKey !== targetKey) {
          sourceKey = srcKey
          break
        }
      }
    }

    // If we can't find the cog or it's already in place, skip
    if (sourceKey === null) {
      continue
    }

    // Generate and record the swap step
    const fromPos = getPosition(sourceKey)
    const toPos = getPosition(targetKey)
    steps.push({
      from: { location: fromPos.location, x: fromPos.x, y: fromPos.y },
      to: { location: toPos.location, x: toPos.x, y: toPos.y },
    })

    // Apply the swap to our working state so subsequent lookups are correct
    moveCog(currentState, sourceKey, targetKey)
  }

  logger.log(`Calculated ${steps.length} optimal steps`)

  // Verify the steps produce the correct final state
  const verifyState = cloneInventory(initial)
  for (const step of steps) {
    const fromKey = getKeyFromPosition(
      step.from.location,
      step.from.x,
      step.from.y
    )
    const toKey = getKeyFromPosition(step.to.location, step.to.x, step.to.y)
    moveCog(verifyState, fromKey, toKey)
  }

  let matchesFinal = true
  const allKeys = new Set([
    ...Object.keys(final.cogs).map((k) => Number.parseInt(k, 10)),
    ...Object.keys(verifyState.cogs).map((k) => Number.parseInt(k, 10)),
  ])

  for (const key of allKeys) {
    const verifyCog = verifyState.cogs[key]
    const finalCog = final.cogs[key]

    if (!cogsMatch(verifyCog, finalCog)) {
      matchesFinal = false
      logger.log(
        `Mismatch at key ${key}: verify=${JSON.stringify(verifyCog)}, final=${JSON.stringify(finalCog)}`
      )
    }
  }

  if (!matchesFinal) {
    logger.log(
      "Warning: Generated steps do not produce the expected final state"
    )
  } else {
    logger.log("Steps verified successfully")
  }

  return steps
}

export const solver = async (
  inventory: ParsedConstructionData,
  weights: SolverWeights,
  solveTime = 1000
): Promise<SolverResult | null> => {
  if (inventory.flagPose.length === 0) {
    weights = { ...weights, flaggy: 0 }
  }

  let state = cloneInventory(inventory)
  const solutions: ParsedConstructionData[] = [state]
  const startTime = Date.now()
  const allSlots = inventory.availableSlotKeys
  let counter = 0

  // Calculate initial score
  state.score = calculateScore({
    cogs: state.cogs,
    slots: state.slots,
    flagPose: state.flagPose,
    flaggyShopUpgrades: state.flaggyShopUpgrades,
    availableSlotKeys: state.availableSlotKeys,
  })

  if (!state.score) {
    return null
  }

  const totalCogs = Object.keys(inventory.cogs).length
  const totalSlots = allSlots.length
  logger.log(
    `Starting solver optimization... (${totalCogs} cogs, ${totalSlots} available slots)`
  )

  let currentScore = getScoreSum(state.score, weights)
  let bestScoreEver = currentScore
  let improvementCount = 0
  let lastYield = Date.now()

  while (Date.now() - startTime < solveTime) {
    counter++

    // Yield to event loop every 100ms to prevent blocking
    if (Date.now() - lastYield > 100) {
      await new Promise((resolve) => setImmediate(resolve))
      lastYield = Date.now()
    }

    if (counter % 10000 === 0) {
      // Save current optimized state BEFORE restarting
      if (state.score) {
        solutions.push(cloneInventory(state))
      }

      // Restart from a new random state
      state = cloneInventory(inventory)
      shuffle(state)
      state.score = calculateScore({
        cogs: state.cogs,
        slots: state.slots,
        flagPose: state.flagPose,
        flaggyShopUpgrades: state.flaggyShopUpgrades,
        availableSlotKeys: state.availableSlotKeys,
      })
      if (state.score) {
        currentScore = getScoreSum(state.score, weights)
      }
    }

    const slotKey = allSlots[Math.floor(Math.random() * allSlots.length)]
    const allKeys = getCogKeys(state)
    const cogKey = allKeys[Math.floor(Math.random() * allKeys.length)]
    const slot = getEntry(slotKey, state)
    const cog = getEntry(cogKey, state)

    if (!slot || !cog) continue
    if (slot.fixed || cog.fixed) continue

    const cogPosition = getPosition(cogKey)
    if (cogPosition.location === "build") continue

    moveCog(state, cogKey, slotKey)

    state.score = calculateScore({
      cogs: state.cogs,
      slots: state.slots,
      flagPose: state.flagPose,
      flaggyShopUpgrades: state.flaggyShopUpgrades,
      availableSlotKeys: state.availableSlotKeys,
    })

    if (!state.score) {
      // Revert move if score calculation failed
      moveCog(state, slotKey, cogKey)
      continue
    }

    const scoreSumUpdate = getScoreSum(state.score, weights)
    if (scoreSumUpdate > currentScore) {
      currentScore = scoreSumUpdate
      improvementCount++
      if (scoreSumUpdate > bestScoreEver) {
        bestScoreEver = scoreSumUpdate
      }
    } else {
      // Revert move if score didn't improve
      moveCog(state, slotKey, cogKey)
      state.score = calculateScore({
        cogs: state.cogs,
        slots: state.slots,
        flagPose: state.flagPose,
        flaggyShopUpgrades: state.flaggyShopUpgrades,
        availableSlotKeys: state.availableSlotKeys,
      })
    }
  }

  // Save final optimized state
  if (state.score) {
    solutions.push(cloneInventory(state))
  }

  const elapsedTime = Date.now() - startTime
  const iterationsPerSecond = Math.round(counter / (elapsedTime / 1000))
  logger.log(
    `Solver stats: ${counter} iterations in ${elapsedTime}ms (${iterationsPerSecond}/sec), ${improvementCount} improvements, ${solutions.length} solutions`
  )

  // Find best solution
  const scores = solutions
    .map((s) => {
      if (!s.score) return -Infinity
      return getScoreSum(s.score, weights)
    })
    .filter((s) => s !== -Infinity)

  if (scores.length === 0) {
    return null
  }

  const bestScore = Math.max(...scores)
  const bestIndex = scores.indexOf(bestScore)
  const best = solutions[bestIndex]

  if (!best) {
    return null
  }

  logger.log("Solver optimization completed, processing results...")

  const optimized = removeUselessMoves(inventory, best, weights)
  const steps = getOptimalSteps(inventory, optimized)

  if (!optimized.score) {
    return null
  }

  return {
    score: optimized.score,
    steps,
  }
}
