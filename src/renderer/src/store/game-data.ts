import { create } from "zustand"

import type { ParsedConstructionData } from "@/types/construction"

type GameDataState = {
  construction: ParsedConstructionData | null
  // Future parsers can be added here:
  // summoning: ParsedSummoningData | null
  // weeklyBattle: ParsedWeeklyBattleData | null
  setConstructionData: (data: ParsedConstructionData | null) => void
  // Future setters can be added here following the same pattern
}

export const useGameDataStore = create<GameDataState>((set) => ({
  construction: null,
  setConstructionData: (data) => set({ construction: data }),
}))
