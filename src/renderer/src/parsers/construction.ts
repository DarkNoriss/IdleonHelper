import { cogKeyMap, flagsReqs } from "@/data/construction"
import { parse } from "@/utils/parse"

import type {
  Board,
  BoardSlot,
  Cog,
  CogDetails,
  CogStat,
} from "@/types/construction"
import type { IdleonJson } from "@/types/idleon-json"

const BOARD_X = 12
const BOARD_Y = 8

export const parseConstruction = (rawJson: IdleonJson): Board | null => {
  try {
    const cogMapRaw = parse(rawJson.data.CogM as string) as Cog[]
    const cogOrderRaw = parse(rawJson.data.CogO as string) as string[]

    const cogMap = createCogMap(cogMapRaw, cogOrderRaw.length)
    const cogsMap = parseCogs(cogMap)
    const board = getFlags(cogsMap, cogOrderRaw, rawJson)

    return {
      ...board,
    }
  } catch (error) {
    console.error("Failed to parse construction JSON", error)
    return null
  }
}

const createCogMap = (cogMap: Cog[], length: number): Cog[] => {
  const array: Cog[] = []
  for (let i = 0; i < length; i++) {
    array[i] = cogMap?.[i] || {}
  }

  return array
}

const parseCogs = (cogMap: Cog[]): CogDetails[] =>
  cogMap.map((cogObject) =>
    Object.entries(cogObject ?? {}).reduce<CogDetails>((res, [key, value]) => {
      const mappedName = cogKeyMap?.[key]

      if (mappedName && mappedName !== "_") {
        return {
          ...res,
          [key]: { name: mappedName, value },
        }
      }

      return { ...res, [key]: value }
    }, {})
  )

const getFlags = (
  cogsMap: CogDetails[],
  cogsOrder: string[],
  rawJson: IdleonJson
): Board => {
  const flagsUnlockedRaw = parse(rawJson.data.FlagU as string) as number[]
  const flagsPlacedRaw = parse(rawJson.data.FlagP as string) as number[]

  return parseFlags(
    flagsUnlockedRaw,
    flagsPlacedRaw,
    cogsMap,
    cogsOrder,
    rawJson
  )
}

const parseFlags = (
  flagsUnlockedRaw: number[],
  flagsPlacedRaw: number[],
  cogsMap: CogDetails[],
  cogsOrder: string[],
  rawJson: IdleonJson
): Board => {
  const board = (flagsUnlockedRaw ?? []).reduce<Board["baseBoard"]>(
    (res, flagSlot, index) => {
      const name = cogsOrder?.[index]
      const stats = cogsMap?.[index]
      const currentAmount =
        flagSlot === -11 ? flagsReqs?.[index] : (flagSlot ?? 0)

      const requiredAmount = flagsReqs?.[index] ?? 0
      const flagPlaced = flagsPlacedRaw?.includes(index) ?? false

      return [
        ...res,
        {
          currentAmount,
          requiredAmount,
          flagPlaced,
          cog: {
            name,
            stats,
            originalIndex: index,
          },
        },
      ]
    },
    []
  )

  type PlayerCog = CogDetails & { name?: string }

  const playerCogs: PlayerCog[] = (cogsMap ?? []).map((cog, index) => ({
    ...cog,
    name: cogsOrder?.[index],
  }))

  const playersBuildRate = playerCogs
    .filter(({ name }) => name?.includes("Player_"))
    .reduce((sum, cog) => {
      const stat = cog["a"]

      if (isCogStat(stat)) {
        return sum + (Number(stat.value) || 0)
      }

      if (typeof stat === "number") {
        return sum + stat
      }

      return sum
    }, 0)

  const flaggyShopUpgradesRaw = parse(
    rawJson.data.GemItemsPurchased as string
  ) as number[]
  const flaggyShopUpgrades = flaggyShopUpgradesRaw?.[184] ?? 0

  const flaggyMulti = 1 + (50 * flaggyShopUpgrades) / 100
  const firstBoard = evaluateBoard(board, rawJson)

  return {
    ...firstBoard,
    baseBoard: board,
    totalFlaggyRate: firstBoard?.totalFlaggyRate * flaggyMulti,
    playersBuildRate,
  }
}

const evaluateBoard = (currentBoard: BoardSlot[], rawJson: IdleonJson) => {
  const { boosted, relations } = getAllBoostedCogs(currentBoard)
  let totalBuildRate = 0,
    totalExpRate = 0,
    totalFlaggyRate = 0,
    totalPlayerExpRate = 0

  const characters = rawJson.charNames

  let updatedBoard = currentBoard?.map((slot, index) => {
    const { cog } = slot || {}

    const {
      e: boostedBuildRate,
      g: boostedFlaggyRate,
      f: _characterExpPerHour,
    } = boosted?.[index] || {}

    const cogBaseBuildRate = Number((cog?.stats?.a as CogStat)?.value) || 0
    const cogBaseFlaggyRate = Number((cog?.stats?.c as CogStat)?.value) || 0
    const cogBasePlayerCharacterExp =
      Number((cog?.stats?.b as CogStat)?.value) || 0
    let playerExp = 0

    if (cog?.name?.includes("Player_")) {
      const character = characters?.find(
        (name) => name === cog?.name?.replace("Player_", "")
      )
      if (!character) {
        totalPlayerExpRate += cogBasePlayerCharacterExp
      }
    }

    const buildRate =
      cogBaseBuildRate * (1 + (Number(boostedBuildRate?.value) || 0) / 100)

    totalBuildRate += Math.max(buildRate, 0)

    totalExpRate += Number((cog?.stats?.d as CogStat)?.value) || 0

    const flaggyRate =
      cogBaseFlaggyRate +
      (cogBaseFlaggyRate * (Number(boostedFlaggyRate?.value) || 0)) / 100
    totalFlaggyRate += Math.max(flaggyRate, 0)

    return {
      ...slot,
      cog: {
        ...cog,
        stats: {
          ...cog?.stats,
          a: { ...(cog?.stats?.a as CogStat), value: buildRate },
          c: { ...(cog?.stats?.c as CogStat), value: flaggyRate },
          ...(characters
            ? { b: { ...(cog?.stats?.b as CogStat), value: playerExp } }
            : {}),
        },
      },
      affectedBy: relations?.[index] || [],
      affects: Object.entries(relations)
        .filter(([_, affectingIndices]) => affectingIndices.includes(index))
        .map(([affectedIndex]) => parseInt(affectedIndex)),
    }
  })

  if (characters) {
    updatedBoard = updatedBoard?.map((slot) => {
      if (slot?.cog?.name?.includes("Player_")) {
        return {
          ...slot,
          cog: {
            ...slot?.cog,
            stats: {
              ...slot?.cog?.stats,
              b: {
                ...(slot?.cog?.stats?.b as CogStat),
                value:
                  (slot?.cog?.stats?.b?.value as number) *
                  (1 + totalExpRate / 100),
              },
            },
          },
        }
      }
      return slot
    })
  }

  return {
    totalBuildRate,
    totalExpRate,
    totalFlaggyRate,
    totalPlayerExpRate:
      totalPlayerExpRate * (characters ? 1 + totalExpRate / 100 : 1),
    board: updatedBoard,
  }
}

const getAllBoostedCogs = (
  board: BoardSlot[]
): {
  boosted: { e: CogStat; f: CogStat; g: CogStat }[]
  relations: Record<number, number[]>
} => {
  const relations: Record<number, number[]> = {}
  let boosted: { e: CogStat; f: CogStat; g: CogStat }[] = new Array(
    BOARD_X * BOARD_Y
  ).fill(0)
  for (let y = 0; y < BOARD_Y; y++) {
    for (let x = 0; x < BOARD_X; x++) {
      const index = (7 - y) * 12 + x
      const currentCog = board?.[index]?.cog
      const currentCogStats = board?.[index]?.cog?.stats || {}

      let affected: [number, number][] = getAffectedIndexes(currentCog, x, y)

      if (affected?.length > 0) {
        const affectedIndices = affected
          .map(([x, y]) =>
            x < 0 || y < 0 || x >= BOARD_X || y >= BOARD_Y
              ? null
              : (7 - y) * 12 + x
          )
          .filter((num): num is number => num !== null)

        const { e: eStat, f: fStat, g: gStat } = currentCogStats || {}
        const e = eStat as CogStat
        const f = fStat as CogStat
        const g = gStat as CogStat

        if (e || f || g) {
          for (let i = 0; i < affectedIndices.length; i++) {
            const affectedIndex = affectedIndices[i]
            if (!boosted?.[affectedIndex]) {
              boosted[affectedIndex] = {
                e: { ...e, value: Math.ceil(e?.value as number) },
                f: { ...f, value: Math.ceil(f?.value as number) },
                g: { ...g, value: Math.ceil(g?.value as number) },
              }
            } else {
              const { e: curE, f: curF, g: curG } = boosted[affectedIndex] || {}

              boosted[affectedIndex] = {
                // build rate
                e: {
                  ...curE,
                  value: Math.ceil(
                    (curE?.value as number) + (e?.value as number)
                  ),
                },
                f: {
                  ...curF,
                  value: Math.ceil(
                    (curF?.value as number) + (f?.value as number)
                  ),
                },
                // flaggy rate
                g: {
                  ...curG,
                  value: Math.ceil(
                    (curG?.value as number) + (g?.value as number)
                  ),
                },
              }
            }
            relations[affectedIndex] = [
              ...(relations[affectedIndex] || []),
              index,
            ]
          }
        }
      }
    }
  }

  return { boosted, relations }
}

const getAffectedIndexes = (
  cog: BoardSlot["cog"],
  x: number,
  y: number
): [number, number][] => {
  const affected: [number, number][] = []

  switch (cog?.stats?.h) {
    case "diagonal":
      affected.push(
        [x - 1, y - 1],
        [x + 1, y - 1],
        [x - 1, y + 1],
        [x + 1, y + 1]
      )
      break

    case "adjacent":
      affected.push([x - 1, y], [x, y + 1], [x + 1, y], [x, y - 1])
      break

    case "up":
      affected.push(
        [x - 1, y + 2],
        [x, y + 2],
        [x + 1, y + 2],
        [x - 1, y + 1],
        [x, y + 1],
        [x + 1, y + 1]
      )
      break

    case "right":
      affected.push(
        [x + 2, y - 1],
        [x + 2, y],
        [x + 2, y + 1],
        [x + 1, y - 1],
        [x + 1, y],
        [x + 1, y + 1]
      )
      break

    case "down":
      affected.push(
        [x - 1, y - 2],
        [x, y - 2],
        [x + 1, y - 2],
        [x - 1, y - 1],
        [x, y - 1],
        [x + 1, y - 1]
      )
      break

    case "left":
      affected.push(
        [x - 2, y - 1],
        [x - 2, y],
        [x - 2, y + 1],
        [x - 1, y - 1],
        [x - 1, y],
        [x - 1, y + 1]
      )
      break

    case "row":
      for (let k = 0; k < BOARD_X; k++) {
        if (x === k) continue

        affected.push([k, y])
      }
      break

    case "column":
      for (let k = 0; k < BOARD_Y; k++) {
        if (y === k) continue

        affected.push([x, k])
      }
      break

    case "corners":
      affected.push(
        [x - 2, y - 2],
        [x + 2, y - 2],
        [x - 2, y + 2],
        [x + 2, y + 2]
      )
      break

    case "around":
      affected.push(
        [x, y - 2],
        [x - 1, y - 1],
        [x, y - 1],
        [x + 1, y - 1],
        [x - 2, y],
        [x - 1, y],
        [x + 1, y],
        [x + 2, y],
        [x - 1, y + 1],
        [x, y + 1],
        [x + 1, y + 1],
        [x, y + 2]
      )
      break

    case "everything":
      for (let l = 0; l < BOARD_Y; l++) {
        for (let k = 0; k < BOARD_X; k++) {
          if (y === l && x === k) continue

          affected.push([k, l])
        }
      }
      break

    default:
      break
  }

  return affected
}

const isCogStat = (value: CogDetails[string]): value is CogStat =>
  typeof value === "object" && value !== null && "value" in value
