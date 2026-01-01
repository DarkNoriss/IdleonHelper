import type { ParsedConstructionData } from "../../../parsers/construction"

export type SolverWeights = {
  buildRate: number
  exp: number
  flaggy: number
}

export const solver = async (
  inventory: ParsedConstructionData,
  weights: SolverWeights,
  solveTime = 1000
): Promise<null> => {
  console.log({ solveTime })

  if (inventory.flagPose.length === 0) {
    weights.flaggy = 0
  }

  console.log(weights)

  return null
}
