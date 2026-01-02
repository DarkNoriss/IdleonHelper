export type ParsedCog = {
  key: number
  buildRate: unknown
  isPlayer: boolean
  expGain: unknown
  flaggy: unknown
  expBonus: unknown
  buildRadiusBoost: unknown
  expRadiusBoost: unknown
  flaggyRadiusBoost: unknown
  boostRadius: unknown
  flagBoost: unknown
  nothing: unknown
  fixed: boolean
  blocked: boolean
}

export type ParsedConstructionData = {
  cogs: Record<number, ParsedCog>
  slots: Record<number, ParsedCog>
  flagPose: number[]
  flaggyShopUpgrades: number
  availableSlotKeys: number[]
  score: Score | null
}

export type Score = {
  buildRate: number
  expBonus: number
  flaggy: number
  expBoost: number
  flagBoost: number
}

export type OptimalStep = {
  from: {
    location: "board" | "build" | "spare"
    x: number
    y: number
  }
  to: {
    location: "board" | "build" | "spare"
    x: number
    y: number
  }
}

export type SolverWeights = {
  buildRate: number
  exp: number
  flaggy: number
}

export type SolverResult = {
  score: Score
  steps: OptimalStep[]
}
