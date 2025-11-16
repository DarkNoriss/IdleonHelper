import { create } from "zustand"
import { persist } from "zustand/middleware"

interface JsonDataState {
  jsonData: string | null
  setJsonData: (data: string) => void
  clearJsonData: () => void
}

export const useJsonDataStore = create<JsonDataState>()(
  persist(
    (set) => ({
      jsonData: null,
      setJsonData: (data: string) => set({ jsonData: data }),
      clearJsonData: () => set({ jsonData: null }),
    }),
    {
      name: "json-data-storage", // unique name for localStorage key
    }
  )
)
