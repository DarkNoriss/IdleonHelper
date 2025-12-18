import { ElectronAPI } from "@electron-toolkit/preload"

type ConnectionStatus = "connecting" | "connected" | "error"

type BackendStatus = {
  status: ConnectionStatus
  error: string | null
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
    }
  }
}
