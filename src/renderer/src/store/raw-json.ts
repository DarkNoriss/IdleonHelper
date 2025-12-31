import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { RawJson } from "../../../types/raw-json"

type RawJsonState = {
  rawJson: string
  parsedJson: RawJson | null
  setRawJson: (json: string) => void
  clearRawJson: () => void
}

export const useRawJsonStore = create<RawJsonState>()(
  persist(
    (set) => ({
      rawJson: "",
      parsedJson: null,
      setRawJson: (json: string) => {
        let parsedJson: RawJson | null = null
        try {
          parsedJson = JSON.parse(json) as RawJson
        } catch {
          // Invalid JSON, keep parsedJson as null
        }
        set({ rawJson: json, parsedJson })
      },
      clearRawJson: () => set({ rawJson: "", parsedJson: null }),
    }),
    {
      name: "raw-json-storage",
    }
  )
)
