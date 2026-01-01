import type {
  OptimalStep,
  ParsedCog,
  ParsedConstructionData,
  Score,
  SolverResult,
  SolverWeights,
} from "../../../types/construction"
import { calculateScore, getPosition } from "../../../parsers/construction"
import { logger } from "../../utils"

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
  // Swap cogs between positions
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

  // Invalidate score cache
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

export const shuffle = (inventory: ParsedConstructionData, n = 500): void => {
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

  // Calculate moves needed to go from initial to final
  const moves: Move[] = []

  // Compare initial and final states to find actual moves
  const initialCogs = new Set(Object.keys(initial.cogs).map(Number.parseInt))

  // Find cogs that moved
  for (const key of initialCogs) {
    const initialCog = initial.cogs[key]
    if (!initialCog) {
      continue
    }

    const finalCogAtKey = final.cogs[key]

    // Check if cog moved to a different position
    // If no cog at this position in final, or different cog, it moved
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
      // Find where this cog ended up in final state
      for (const [finalKey, finalCog] of Object.entries(final.cogs)) {
        if (!finalCog) {
          continue
        }

        // Match by properties (not key, since key changes)
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

  // Test each move to see if it improves the score
  const usefulMoves: Move[] = []

  for (const move of moves) {
    // Test each move independently from the initial state
    const testState = cloneInventory(initial)

    // Calculate score before move
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

    // Apply the move
    moveCog(testState, move.fromKey, move.toKey)

    // Calculate score after move
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

  // Apply only useful moves to create optimized final state
  const optimized = cloneInventory(initial)
  for (const move of usefulMoves) {
    moveCog(optimized, move.fromKey, move.toKey)
  }

  // Recalculate final score
  optimized.score = calculateScore({
    cogs: optimized.cogs,
    slots: optimized.slots,
    flagPose: optimized.flagPose,
    flaggyShopUpgrades: optimized.flaggyShopUpgrades,
    availableSlotKeys: optimized.availableSlotKeys,
  })

  return optimized
}

const getOptimalSteps = (
  initial: ParsedConstructionData,
  final: ParsedConstructionData
): OptimalStep[] => {
  logger.log("Calculating optimal steps...")

  // Track which cogs moved from their initial positions
  // Map: initialKey -> finalKey
  const cogMovements = new Map<number, number>()

  // Find all cogs that moved
  for (const [keyStr, initialCog] of Object.entries(initial.cogs)) {
    const initialKey = Number.parseInt(keyStr, 10)
    if (!initialCog) {
      continue
    }

    const finalCogAtKey = final.cogs[initialKey]

    // Check if cog moved
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
      // Find where this cog ended up in final state
      for (const [finalKey, finalCog] of Object.entries(final.cogs)) {
        if (!finalCog) {
          continue
        }

        // Match by properties
        if (
          initialCog.buildRate === finalCog.buildRate &&
          initialCog.expBonus === finalCog.expBonus &&
          initialCog.flaggy === finalCog.flaggy &&
          initialCog.isPlayer === finalCog.isPlayer
        ) {
          const finalKeyNum = Number.parseInt(finalKey, 10)
          if (initialKey !== finalKeyNum) {
            cogMovements.set(initialKey, finalKeyNum)
            break
          }
        }
      }
    }
  }

  logger.log(`Found ${cogMovements.size} cogs that moved`)

  // Handle multi-step movements (chains)
  // Similar to the reference implementation
  const steps: OptimalStep[] = []
  const interimCogs = new Map<number, number>()

  // Initialize interimCogs with all movements
  for (const [initialKey, finalKey] of cogMovements.entries()) {
    interimCogs.set(initialKey, finalKey)
  }

  // Process chains of movements
  while (interimCogs.size > 0) {
    const firstEntry = Array.from(interimCogs.entries())[0]
    if (!firstEntry) {
      break
    }

    const [keyFrom, keyTo] = firstEntry

    // Check if there's a chain (the cog at keyTo also moved)
    const targetCogFinalKey = interimCogs.get(keyTo)

    if (targetCogFinalKey && targetCogFinalKey !== keyFrom) {
      // Chain detected: cog at keyTo also moved
      // Update the mapping to follow the chain
      interimCogs.set(keyFrom, targetCogFinalKey)
      const fromPos = getPosition(keyFrom)
      const toPos = getPosition(keyTo)
      steps.push({
        fromPos: {
          location: fromPos.location,
          x: fromPos.x,
          y: fromPos.y,
        },
        toPos: {
          location: toPos.location,
          x: toPos.x,
          y: toPos.y,
        },
      })
      interimCogs.delete(keyTo)
    } else {
      // No chain, simple move
      const fromPos = getPosition(keyFrom)
      const toPos = getPosition(keyTo)
      steps.push({
        fromPos: {
          location: fromPos.location,
          x: fromPos.x,
          y: fromPos.y,
        },
        toPos: {
          location: toPos.location,
          x: toPos.x,
          y: toPos.y,
        },
      })
      interimCogs.delete(keyFrom)
    }
  }

  logger.log(`Calculated ${steps.length} optimal steps`)

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

  logger.log("Starting solver optimization...")

  let currentScore = getScoreSum(state.score, weights)
  let lastYield = Date.now()

  while (Date.now() - startTime < solveTime) {
    counter++

    // Yield to event loop every 100ms to prevent blocking
    if (Date.now() - lastYield > 100) {
      await new Promise((resolve) => setImmediate(resolve))
      lastYield = Date.now()
    }

    if (counter % 10000 === 0) {
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
        solutions.push(state)
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

  // Remove useless moves from the best solution
  const optimized = removeUselessMoves(inventory, best, weights)

  // Calculate optimal steps
  const steps = getOptimalSteps(inventory, optimized)

  if (!optimized.score) {
    return null
  }

  return {
    score: optimized.score,
    steps,
  }
}
