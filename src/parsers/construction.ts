import type { RawJson } from "../types/raw-json"

export const INV_ROWS = 8
export const INV_COLUMNS = 12
export const SPARE_START = 108

export type Position = {
  location: "board" | "build" | "spare"
  x: number
  y: number
}

export const getPosition = (keyNum: number): Position => {
  // board = 0-95
  // build = 96-107
  // spare = 108-*
  const location: "board" | "build" | "spare" =
    keyNum >= 96 ? (keyNum <= 107 ? "build" : "spare") : "board"

  let perRow = 3
  let offset = SPARE_START

  if (location === "board") {
    perRow = INV_COLUMNS
    offset = 0
  } else if (location === "build") {
    offset = 96
  }

  const y = Math.floor((keyNum - offset) / perRow)
  const x = (keyNum - offset) % perRow

  return { location, x, y }
}

type CogRaw = {
  a?: unknown
  b?: unknown
  c?: unknown
  d?: unknown
  e?: unknown
  f?: unknown
  g?: unknown
  h?: unknown
  j?: unknown
  k?: unknown
}

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

export const parseConstruction = (
  jsonData: RawJson
): ParsedConstructionData => {
  const cogsArray = extractCogs(jsonData)
  const flaggyShopUpgrades = extractFlaggyShopUpgrades(jsonData)
  const flagPose = extractFlagPose(jsonData)
  const flagSlots = extractFlagSlots(jsonData, flagPose)

  // Map slots to a key -> obj map
  const slots: Record<number, ParsedCog> = {}
  const availableSlotKeys: number[] = []
  for (const slot of flagSlots) {
    slots[slot.key] = slot
    if (!slot.fixed) {
      availableSlotKeys.push(slot.key)
    }
  }

  // Map cogs to a key -> obj map
  const cogs: Record<number, ParsedCog> = {}
  if (cogsArray !== null) {
    for (const cog of cogsArray) {
      cogs[cog.key] = cog
    }
  }

  // Calculate score
  const score = calculateScore({
    cogs,
    flaggyShopUpgrades,
    flagPose,
    slots,
    availableSlotKeys,
  })

  return {
    cogs,
    slots,
    flagPose,
    flaggyShopUpgrades,
    availableSlotKeys,
    score,
  }
}

const extractCogs = (jsonData: RawJson): ParsedCog[] | null => {
  const cogM = jsonData.data.CogM
  if (!cogM) {
    return null
  }

  let parsed: unknown
  try {
    // Handle both string (needs parsing) and already-parsed object
    if (typeof cogM === "string") {
      parsed = JSON.parse(cogM)
    } else if (
      typeof cogM === "object" &&
      cogM !== null &&
      !Array.isArray(cogM)
    ) {
      parsed = cogM
    } else {
      return null
    }
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      const cogsMap = parsed as Record<string, CogRaw>
      const mappedCogs = Object.entries(cogsMap).map(([key, c]) => {
        const keyNum = Number.parseInt(key)
        return {
          key: keyNum,
          buildRate: c.a,
          isPlayer: (c.b as number) > 0,
          expGain: c.b,
          flaggy: c.c,
          expBonus: c.d,
          buildRadiusBoost: c.e,
          expRadiusBoost: c.f,
          flaggyRadiusBoost: c.g,
          boostRadius: c.h,
          flagBoost: c.j,
          nothing: c.k,
          fixed: c.h === "everything",
          blocked: false,
        }
      })
      return mappedCogs
    }
  } catch {
    return null
  }

  return null
}

const extractFlaggyShopUpgrades = (jsonData: RawJson): number => {
  const gemItemsPurchased = jsonData.data.GemItemsPurchased
  if (!gemItemsPurchased) {
    return 0
  }

  let parsed: unknown
  try {
    // Handle both string (needs parsing) and already-parsed array
    if (typeof gemItemsPurchased === "string") {
      parsed = JSON.parse(gemItemsPurchased)
    } else if (Array.isArray(gemItemsPurchased)) {
      parsed = gemItemsPurchased as unknown[]
    } else {
      return 0
    }
    if (Array.isArray(parsed) && parsed.length > 118) {
      const value = parsed[118]
      return typeof value === "number" ? value : 0
    }
  } catch {
    return 0
  }

  return 0
}

const extractFlagPose = (jsonData: RawJson): number[] => {
  const flagP = jsonData.data.FlagP
  if (!flagP) {
    return []
  }

  let parsed: unknown
  try {
    // Handle both string (needs parsing) and already-parsed array
    if (typeof flagP === "string") {
      parsed = JSON.parse(flagP)
    } else if (Array.isArray(flagP)) {
      parsed = flagP as unknown[]
    } else {
      return []
    }
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is number => typeof v === "number" && v >= 0)
    }
  } catch {
    return []
  }

  return []
}

const extractFlagSlots = (
  jsonData: RawJson,
  flagPose: number[]
): ParsedCog[] => {
  const flagU = jsonData.data.FlagU
  if (!flagU) {
    return []
  }

  let parsed: unknown
  try {
    // Handle both string (needs parsing) and already-parsed array
    if (typeof flagU === "string") {
      parsed = JSON.parse(flagU)
    } else if (Array.isArray(flagU)) {
      parsed = flagU as unknown[]
    } else {
      return []
    }
    if (Array.isArray(parsed)) {
      return parsed.map((n, i) => {
        if (n > 0 && flagPose.includes(i)) {
          return {
            key: i,
            buildRate: null,
            isPlayer: false,
            expGain: null,
            flaggy: null,
            expBonus: null,
            buildRadiusBoost: null,
            expRadiusBoost: null,
            flaggyRadiusBoost: null,
            boostRadius: null,
            flagBoost: null,
            nothing: null,
            fixed: true,
            blocked: true,
          }
        }
        if (n !== -11) {
          return {
            key: i,
            buildRate: null,
            isPlayer: false,
            expGain: null,
            flaggy: null,
            expBonus: null,
            buildRadiusBoost: null,
            expRadiusBoost: null,
            flaggyRadiusBoost: null,
            boostRadius: null,
            flagBoost: null,
            nothing: null,
            fixed: true,
            blocked: true,
          }
        }
        return {
          key: i,
          buildRate: null,
          isPlayer: false,
          expGain: null,
          flaggy: null,
          expBonus: null,
          buildRadiusBoost: null,
          expRadiusBoost: null,
          flaggyRadiusBoost: null,
          boostRadius: null,
          flagBoost: null,
          nothing: null,
          fixed: false,
          blocked: false,
        }
      })
    }
  } catch {
    return []
  }

  return []
}

const safeGet = <T>(arr: unknown, ...indexes: number[]): T | undefined => {
  let current: unknown = arr
  for (const index of indexes) {
    if (current === undefined || current === null) break
    if (typeof current === "object" && Array.isArray(current)) {
      current = current[index]
    } else {
      return undefined
    }
  }
  return current as T | undefined
}

const getEntry = (
  key: number,
  cogs: Record<number, ParsedCog>,
  slots: Record<number, ParsedCog>
): ParsedCog | undefined => {
  return cogs[key] ?? slots[key]
}

export const calculateScore = (
  data: Omit<ParsedConstructionData, "score">
): Score | null => {
  const result: Score = {
    buildRate: 0,
    expBonus: 0,
    flaggy: 0,
    expBoost: 0,
    flagBoost: 0,
  }

  // Create bonus grid
  const bonusGrid = Array(INV_ROWS)
    .fill(0)
    .map(() => {
      return Array(INV_COLUMNS)
        .fill(0)
        .map(() => {
          return { ...result }
        })
    })

  // First pass: Calculate bonuses from boostRadius
  for (const key of data.availableSlotKeys) {
    const entry = getEntry(key, data.cogs, data.slots)
    if (!entry) continue
    if (!entry.boostRadius || typeof entry.boostRadius !== "string") continue

    const position = getPosition(key)
    if (position.location !== "board") continue

    const { x: j, y: i } = position
    const boosted: number[][] = []

    switch (entry.boostRadius) {
      case "diagonal":
        boosted.push(
          [i - 1, j - 1],
          [i - 1, j + 1],
          [i + 1, j - 1],
          [i + 1, j + 1]
        )
        break
      case "adjacent":
        boosted.push([i - 1, j], [i, j + 1], [i + 1, j], [i, j - 1])
        break
      case "up":
        boosted.push(
          [i - 2, j - 1],
          [i - 2, j],
          [i - 2, j + 1],
          [i - 1, j - 1],
          [i - 1, j],
          [i - 1, j + 1]
        )
        break
      case "right":
        boosted.push(
          [i - 1, j + 2],
          [i, j + 2],
          [i + 1, j + 2],
          [i - 1, j + 1],
          [i, j + 1],
          [i + 1, j + 1]
        )
        break
      case "down":
        boosted.push(
          [i + 2, j - 1],
          [i + 2, j],
          [i + 2, j + 1],
          [i + 1, j - 1],
          [i + 1, j],
          [i + 1, j + 1]
        )
        break
      case "left":
        boosted.push(
          [i - 1, j - 2],
          [i, j - 2],
          [i + 1, j - 2],
          [i - 1, j - 1],
          [i, j - 1],
          [i + 1, j - 1]
        )
        break
      case "row":
        for (let k = 0; k < INV_COLUMNS; k++) {
          if (j === k) continue
          boosted.push([i, k])
        }
        break
      case "column":
        for (let k = 0; k < INV_ROWS; k++) {
          if (i === k) continue
          boosted.push([k, j])
        }
        break
      case "corner":
        boosted.push(
          [i - 2, j - 2],
          [i - 2, j + 2],
          [i + 2, j - 2],
          [i + 2, j + 2]
        )
        break
      case "around":
        boosted.push(
          [i - 2, j],
          [i - 1, j - 1],
          [i - 1, j],
          [i - 1, j + 1],
          [i, j - 2],
          [i, j - 1],
          [i, j + 1],
          [i, j + 2],
          [i + 1, j - 1],
          [i + 1, j],
          [i + 1, j + 1],
          [i + 2, j]
        )
        break
      case "everything":
        for (let k = 0; k < INV_ROWS; k++) {
          for (let l = 0; l < INV_COLUMNS; l++) {
            if (i === k && j === l) continue
            boosted.push([k, l])
          }
        }
        break
      default:
        break
    }

    for (const boostCoord of boosted) {
      const bonus = safeGet<Score>(bonusGrid, ...boostCoord)
      if (!bonus) continue
      bonus.buildRate +=
        (typeof entry.buildRadiusBoost === "number"
          ? entry.buildRadiusBoost
          : 0) || 0
      bonus.flaggy +=
        (typeof entry.flaggyRadiusBoost === "number"
          ? entry.flaggyRadiusBoost
          : 0) || 0
      bonus.expBoost +=
        (typeof entry.expRadiusBoost === "number" ? entry.expRadiusBoost : 0) ||
        0
      bonus.flagBoost +=
        (typeof entry.flagBoost === "number" ? entry.flagBoost : 0) || 0
    }
  }

  // Second pass: Sum up base stats and apply bonuses
  for (const key of data.availableSlotKeys) {
    const entry = getEntry(key, data.cogs, data.slots)
    if (!entry) continue

    const buildRate = typeof entry.buildRate === "number" ? entry.buildRate : 0
    const expBonus = typeof entry.expBonus === "number" ? entry.expBonus : 0
    const flaggy = typeof entry.flaggy === "number" ? entry.flaggy : 0

    result.buildRate += buildRate
    result.expBonus += expBonus
    result.flaggy += flaggy

    const pos = getPosition(key)
    if (pos.location !== "board") continue

    const bonus = safeGet<Score>(bonusGrid, pos.y, pos.x)
    if (bonus) {
      const buildRateBonus = (bonus.buildRate || 0) / 100
      result.buildRate += Math.ceil(buildRate * buildRateBonus)

      if (entry.isPlayer) {
        result.expBoost += bonus.expBoost || 0
      }

      const flaggyBonus = (bonus.flaggy || 0) / 100
      result.flaggy += Math.ceil(flaggy * flaggyBonus)
    }
  }

  // Third pass: Sum flag bonuses
  for (const key of data.flagPose) {
    const entry = getEntry(key, data.cogs, data.slots)
    if (!entry) continue

    const pos = getPosition(key)
    if (pos.location !== "board") continue

    const bonus = safeGet<Score>(bonusGrid, pos.y, pos.x)
    if (bonus) {
      result.flagBoost += bonus.flagBoost || 0
    }
  }

  // Apply flaggy shop upgrades
  result.flaggy = Math.floor(
    result.flaggy * (1 + data.flaggyShopUpgrades * 0.5)
  )

  return result
}
