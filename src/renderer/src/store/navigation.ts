import { create } from "zustand";
import type { NavigationPage } from "@/app/page-registry";

export type { NavigationPage } from "@/app/page-registry";

type NavigationState = {
  currentPage: NavigationPage;
  setPage: (page: NavigationPage) => void;
};

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: "dashboard",
  setPage: (page) => set({ currentPage: page }),
}));
