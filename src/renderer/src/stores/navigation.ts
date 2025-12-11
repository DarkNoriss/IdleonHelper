import { create } from "zustand"

export type NavigationPage =
  | "dashboard"
  | "account-data"
  | "world-2/weekly-battle"
  | "world-3/construction"
  | "world-3/construction-new"
  | "world-6/summoning"

interface NavigationState {
  currentPage: NavigationPage
  setPage: (page: NavigationPage) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: "dashboard",
  setPage: (page) => set({ currentPage: page }),
}))
