import { create } from "zustand"

export type NavigationPage =
  | "dashboard"
  | "weeklyBattle"
  | "summoning"
  | "world3/construction"
  | "logs"
  | "general/test"

type NavigationState = {
  currentPage: NavigationPage
  setPage: (page: NavigationPage) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: "dashboard",
  setPage: (page) => set({ currentPage: page }),
}))
