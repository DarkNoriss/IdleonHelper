import { create } from "zustand";
import type { NavigationPage } from "@/app/page-ids.ts";

export type { NavigationPage } from "@/app/page-ids.ts";

type NavigationState = {
  currentPage: NavigationPage;
  setPage: (page: NavigationPage) => void;
};

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: "dashboard",
  setPage: (page) => set({ currentPage: page }),
}));
