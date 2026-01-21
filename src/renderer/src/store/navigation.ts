import { create } from "zustand"

export type NavigationPage =
  | "dashboard"
  | "rawData"
  | "weeklyBattle"
  | "summoning"
  | "farming"
  | "world3/construction"
  | "logs"
  | "general/test"
  | "general/store-items"

type NavigationState = {
  currentPage: NavigationPage
  setPage: (page: NavigationPage) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: "dashboard",
  setPage: (page) => set({ currentPage: page }),
}))
