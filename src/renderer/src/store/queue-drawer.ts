import { create } from "zustand";

type QueueDrawerState = {
  expanded: boolean;
  toggle: () => void;
  setExpanded: (expanded: boolean) => void;
};

export const useQueueDrawerStore = create<QueueDrawerState>((set) => ({
  expanded: false,
  toggle: () => set((s) => ({ expanded: !s.expanded })),
  setExpanded: (expanded) => set({ expanded }),
}));
