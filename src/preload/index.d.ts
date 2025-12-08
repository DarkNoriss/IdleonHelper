import { ElectronAPI } from "@electron-toolkit/preload"

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      window: {
        close: () => void
      }
      world3: {
        processJson: (jsonString: string) => Promise<{
          success: boolean
          data?: unknown
          error?: string
        }>
      }
      app: {
        getVersion: () => Promise<string>
      }
      updater: {
        checkForUpdates: () => Promise<{
          available: boolean
          currentVersion: string
          latestVersion?: string
          error?: string
        }>
        downloadUpdate: () => Promise<{
          success: boolean
          error?: string
        }>
        quitAndInstall: () => Promise<void>
        onCheckingForUpdate: (callback: () => void) => void
        onUpdateAvailable: (
          callback: (info: { version: string; releaseDate?: string }) => void
        ) => void
        onUpdateNotAvailable: (callback: () => void) => void
        onUpdateDownloaded: (
          callback: (info: { version: string }) => void
        ) => void
        onUpdateError: (callback: (error: { message: string }) => void) => void
        onDownloadProgress: (
          callback: (progress: {
            percent: number
            transferred: number
            total: number
          }) => void
        ) => void
        onLog: (callback: (message: string) => void) => void
        removeAllListeners: (channel: string) => void
      }
    }
  }
}
