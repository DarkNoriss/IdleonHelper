import { create } from "zustand"

export type ScriptName =
  | "summoning.endless"
  | "summoning.autobattler"
  | "weeklyBattle"
  | null

type ScriptStatusState = {
  currentScript: ScriptName
  setCurrentScript: (script: ScriptName) => void
}

export const useScriptStatusStore = create<ScriptStatusState>((set) => ({
  currentScript: null,
  setCurrentScript: (script) => set({ currentScript: script }),
}))

