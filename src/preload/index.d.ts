import { ElectronAPI } from "@electron-toolkit/preload"

type ConnectionStatus = "connecting" | "connected" | "error"

type BackendStatus = {
  status: ConnectionStatus
  error: string | null
}

type WeeklyBattleStep = {
  stepName: string
  steps: number[]
  rawSteps: string[]
}

type WeeklyBattleInfo = {
  dateFrom: string
  dateTo: string
  bossName: string
  steps: WeeklyBattleStep[]
}

type WeeklyBattleData = {
  fetchedAt: string
  info: WeeklyBattleInfo
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      window: {
        close: () => void
      }
      backend: {
        onStatusChange: (
          callback: (status: BackendStatus) => void
        ) => () => void
      }
      script: {
        navigation: {
          ui: {
            toCodex: () => Promise<boolean>
            toItems: () => Promise<boolean>
          }
        }
      }
      weeklyBattle: {
        get: () => Promise<WeeklyBattleData | null>
        fetch: () => Promise<WeeklyBattleData>
        onDataChange: (
          callback: (data: WeeklyBattleData | null) => void
        ) => () => void
      }
    }
  }
}
