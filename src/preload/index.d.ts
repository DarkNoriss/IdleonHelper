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

type LogLevel = "log" | "error" | "warn" | "info"

type LogEntry = {
  timestamp: number
  level: LogLevel
  message: string
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
        world6: {
          summoning: {
            startEndlessAutobattler: () => Promise<void>
            startAutobattler: () => Promise<void>
          }
        }
      }
      update: {
        getVersion: () => Promise<string>
        checkForUpdates: () => Promise<void>
        downloadUpdate: () => Promise<void>
        installUpdate: () => Promise<void>
        getStatus: () => Promise<{
          version: string
          status:
            | "idle"
            | "checking"
            | "update-available"
            | "update-not-available"
            | "downloading"
            | "update-downloaded"
            | "error"
          error?: string
        }>
        onStatusChange: (
          callback: (status: {
            version: string
            status:
              | "idle"
              | "checking"
              | "update-available"
              | "update-not-available"
              | "downloading"
              | "update-downloaded"
              | "error"
            error?: string
          }) => void
        ) => () => void
        onDownloadProgress: (
          callback: (progress: {
            percent: number
            transferred: number
            total: number
          }) => void
        ) => () => void
      }
      logs: {
        get: () => Promise<LogEntry[]>
        onChange: (callback: (logs: LogEntry[]) => void) => () => void
      }
    }
    logs: {
      get: () => Promise<LogEntry[]>
      onChange: (callback: (logs: LogEntry[]) => void) => () => void
    }
  }
}
