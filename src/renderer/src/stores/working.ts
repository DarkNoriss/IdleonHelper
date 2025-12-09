import { create } from "zustand"

interface WorkingState {
  isWorking: boolean
  currentAction: string | null
  startWorking: (action: string) => void
  stopWorking: () => void
}

export const useWorkingStore = create<WorkingState>((set) => ({
  isWorking: false,
  currentAction: null,
  startWorking: (action) => set({ isWorking: true, currentAction: action }),
  stopWorking: () => set({ isWorking: false, currentAction: null }),
}))
