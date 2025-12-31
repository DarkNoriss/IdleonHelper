import { useEffect, type ReactNode } from "react"
import { parseConstruction } from "@/parsers/construction"
import { useGameDataStore } from "@/store/game-data"
import { useRawJsonStore } from "@/store/raw-json"

type GameDataProviderProps = {
  children: ReactNode
}

export const GameDataProvider = ({ children }: GameDataProviderProps) => {
  const parsedJson = useRawJsonStore((state) => state.parsedJson)
  const setConstructionData = useGameDataStore(
    (state) => state.setConstructionData
  )
  // Future parsers can add their setters here:
  // const setSummoningData = useGameDataStore((state) => state.setSummoningData)
  // const setWeeklyBattleData = useGameDataStore((state) => state.setWeeklyBattleData)

  useEffect(() => {
    if (!parsedJson) {
      // Clear all parsed data when JSON is cleared
      setConstructionData(null)
      // Future parsers: setSummoningData(null), setWeeklyBattleData(null)
      return
    }

    // Parse construction data
    try {
      const constructionData = parseConstruction(parsedJson)
      setConstructionData(constructionData)
    } catch (error) {
      console.error("Failed to parse construction data:", error)
      setConstructionData(null)
    }

    // Future parsers can be added here:
    // try {
    //   const summoningData = parseSummoning(parsedJson)
    //   setSummoningData(summoningData)
    // } catch (error) {
    //   console.error("Failed to parse summoning data:", error)
    //   setSummoningData(null)
    // }
  }, [parsedJson, setConstructionData])

  return <>{children}</>
}
