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
        getStatus: () => Promise<BackendStatus>
        onStatusChange: (
          callback: (status: BackendStatus) => void
        ) => () => void
      }
      script: {
        getStatus: () => Promise<{ isWorking: boolean }>
        cancel: () => Promise<void>
        onStatusChange: (
          callback: (status: { isWorking: boolean }) => void
        ) => () => void
        world2: {
          weeklyBattle: {
            fetch: () => Promise<WeeklyBattleData>
            get: () => Promise<WeeklyBattleData | null>
            run: (steps: number[]) => Promise<void>
            onChange: (
              callback: (data: WeeklyBattleData | null) => void
            ) => () => void
          }
        }
      }
    }
  }
}
