import { parseConstruction } from "@/parsers/construction"
import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { Board } from "@/types/construction"
import type { IdleonJson } from "@/types/idleon-json"

type AccountDataStore = {
  rawJson?: IdleonJson
  accountData?: {
    construction?: Board
  }
  setRawJson: (data: string) => void
}

export const useAccountDataStore = create<AccountDataStore>()(
  persist(
    (set) => ({
      rawJson: undefined,
      accountData: {},
      setRawJson: (data: string) => {
        const parsed = JSON.parse(data) as IdleonJson

        set({
          rawJson: parsed,
          accountData: {
            construction: parseConstruction(parsed) ?? undefined,
          },
        })
      },
    }),
    {
      name: "account-data-storage",
      merge: (persistedState, currentState) => {
        const incomingState = persistedState as
          | Partial<AccountDataStore>
          | undefined

        const rawJson = incomingState?.rawJson as IdleonJson

        return {
          ...currentState,
          ...incomingState,
          rawJson,
          accountData: {
            construction: parseConstruction(rawJson) ?? undefined,
          },
        }
      },
    }
  )
)
