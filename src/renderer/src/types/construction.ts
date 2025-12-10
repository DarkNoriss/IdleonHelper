export type ConstructionData = {
  id: string
  name: string
  description: string
  image: string
  price: number
  quantity: number
  total: number
}

export type Cog = Record<string, number | string>

export type CogStatValue = number | string

export type CogStat = { name: string; value: CogStatValue }

export type CogDetails = Record<string, CogStat | CogStatValue>

export type BoardSlot = {
  currentAmount: number
  requiredAmount: number
  flagPlaced: boolean
  cog: {
    name?: string
    stats?: CogDetails
    originalIndex: number
  }
}

export type Board = {
  baseBoard: BoardSlot[]
  playersBuildRate: number
  totalFlaggyRate: number
  totalExpRate: number
  totalPlayerExpRate: number
  totalBuildRate: number
}
