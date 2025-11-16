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
      test: {
        runTest: () => Promise<{
          success: boolean
          hwnd?: string
        }>
      }
    }
  }
}
