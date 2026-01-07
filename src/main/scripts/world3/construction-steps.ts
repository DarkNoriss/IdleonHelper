import { getPosition, SPARE_START } from "../../../parsers/construction"
import type {
  OptimalStep,
  ParsedCog,
  ParsedConstructionData,
  SolverWeights,
} from "../../../types/construction"
import { logger } from "../../utils"
import {
  calculateStateScore,
  cloneInventory,
  getKeyFromPosition,
  getScoreSum,
  moveCog,
} from "./construction-solver"

const BOARD_SIZE = 96

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

const hasValidCogValues = (cog: ParsedCog | undefined): boolean => {
  if (!cog) return false

  return (
    cog.buildRate !== undefined ||
    cog.expBonus !== undefined ||
    cog.flaggy !== undefined ||
    cog.isPlayer === true ||
    cog.buildRadiusBoost !== undefined ||
    cog.expRadiusBoost !== undefined ||
    cog.flaggyRadiusBoost !== undefined ||
    cog.boostRadius !== undefined
  )
}

const getMaxSpareKey = (state: ParsedConstructionData): number => {
  let maxKey = SPARE_START - 1
  for (const keyStr of Object.keys(state.cogs)) {
    const key = Number.parseInt(keyStr, 10)
    const pos = getPosition(key)
    if (pos.location === "spare" && key > maxKey) {
      maxKey = key
    }
  }
  return maxKey >= SPARE_START ? maxKey : SPARE_START
}

const findEmptySpareSlot = (
  state: ParsedConstructionData,
  maxSpareKey: number
): number | null => {
  for (let spareKey = SPARE_START; spareKey < maxSpareKey; spareKey++) {
    if (!state.cogs[spareKey]) {
      return spareKey
    }
  }
  return null
}

const createStep = (fromKey: number, toKey: number): OptimalStep => {
  const fromPos = getPosition(fromKey)
  const toPos = getPosition(toKey)
  return {
    from: { location: fromPos.location, x: fromPos.x, y: fromPos.y },
    to: { location: toPos.location, x: toPos.x, y: toPos.y },
  }
}

const findCogInState = (
  state: ParsedConstructionData,
  targetCog: ParsedCog,
  excludeKey?: number
): number | null => {
  for (const [keyStr, cog] of Object.entries(state.cogs)) {
    const key = Number.parseInt(keyStr, 10)
    if (excludeKey !== undefined && key === excludeKey) continue
    if (cogsMatch(cog, targetCog)) {
      return key
    }
  }
  return null
}

interface VerificationResult {
  scoreMatches: boolean
  boardMatches: boolean
  verifyScore: number | null
  finalScore: number | null
  mismatches: Array<{ key: number; verify: string; final: string }>
}

const verifySteps = (
  initial: ParsedConstructionData,
  final: ParsedConstructionData,
  steps: OptimalStep[],
  weights: SolverWeights
): VerificationResult => {
  // Apply steps to initial state
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

  // Calculate scores
  verifyState.score = calculateStateScore(verifyState)
  const verifyScore = verifyState.score
    ? getScoreSum(verifyState.score, weights)
    : null
  const finalScore = final.score ? getScoreSum(final.score, weights) : null

  // Check board matches
  let boardMatches = true
  const mismatches: Array<{ key: number; verify: string; final: string }> = []
  for (let boardKey = 0; boardKey < BOARD_SIZE; boardKey++) {
    const verifyCog = verifyState.cogs[boardKey]
    const finalCog = final.cogs[boardKey]
    const verifyStr = verifyCog
      ? `${verifyCog.buildRate}-${verifyCog.expBonus}-${verifyCog.flaggy}-${verifyCog.isPlayer}`
      : "empty"
    const finalStr = finalCog
      ? `${finalCog.buildRate}-${finalCog.expBonus}-${finalCog.flaggy}-${finalCog.isPlayer}`
      : "empty"
    if (verifyStr !== finalStr) {
      boardMatches = false
      mismatches.push({ key: boardKey, verify: verifyStr, final: finalStr })
    }
  }

  const scoreMatches =
    verifyScore !== null && finalScore !== null && verifyScore === finalScore

  return {
    scoreMatches,
    boardMatches,
    verifyScore,
    finalScore,
    mismatches,
  }
}

export const getOptimalSteps = (
  initial: ParsedConstructionData,
  final: ParsedConstructionData,
  weights: SolverWeights
): OptimalStep[] => {
  const steps: OptimalStep[] = []
  const currentState = cloneInventory(initial)
  const maxSpareKey = Math.max(getMaxSpareKey(initial), getMaxSpareKey(final))

  // Iterate until board matches final state
  const maxIterations = BOARD_SIZE * 2 // Safety limit
  let iterations = 0

  while (iterations < maxIterations) {
    let boardChanged = false

    // Process each board position
    for (let boardKey = 0; boardKey < BOARD_SIZE; boardKey++) {
      const finalCog = final.cogs[boardKey]
      const currentCog = currentState.cogs[boardKey]
      const shouldHaveCog = hasValidCogValues(finalCog)
      const hasCog = hasValidCogValues(currentCog)

      // Position should be empty but has a cog
      if (!shouldHaveCog && hasCog) {
        const emptySpareKey = findEmptySpareSlot(currentState, maxSpareKey)
        if (emptySpareKey !== null) {
          steps.push(createStep(boardKey, emptySpareKey))
          moveCog(currentState, boardKey, emptySpareKey)
          boardChanged = true
          continue
        }
        continue
      }

      // Position should have a cog
      if (shouldHaveCog) {
        // Already correct
        if (cogsMatch(currentCog, finalCog)) {
          continue
        }

        // Find the correct cog (search spare first, then board)
        let sourceKey: number | null = null

        // Search spare slots
        for (let spareKey = SPARE_START; spareKey < maxSpareKey; spareKey++) {
          if (cogsMatch(currentState.cogs[spareKey], finalCog)) {
            sourceKey = spareKey
            break
          }
        }

        // Search board if not found in spare
        if (sourceKey === null) {
          sourceKey = findCogInState(currentState, finalCog, boardKey)
        }

        // Move cog to target position
        if (sourceKey !== null) {
          steps.push(createStep(sourceKey, boardKey))
          moveCog(currentState, sourceKey, boardKey)
          boardChanged = true
        }
      }
    }

    // If board didn't change, we're done
    if (!boardChanged) {
      break
    }

    iterations++
  }

  if (iterations >= maxIterations) {
    logger.log("Warning: Reached max iterations while matching board state")
  }

  // Verify steps produce correct final state
  const verification = verifySteps(initial, final, steps, weights)

  if (!verification.scoreMatches || !verification.boardMatches) {
    logger.log(
      `Warning: Steps produce score ${verification.verifyScore?.toFixed(2)} but expected ${verification.finalScore?.toFixed(2)}`
    )
    if (verification.mismatches.length > 0) {
      logger.log(
        `Found ${verification.mismatches.length} board position mismatches (showing first 10):`
      )
      for (const mismatch of verification.mismatches.slice(0, 10)) {
        logger.log(
          `  Key ${mismatch.key}: verify=[${mismatch.verify}], final=[${mismatch.final}]`
        )
      }
    }
  }

  return steps
}
