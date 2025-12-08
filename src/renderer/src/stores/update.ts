import { useEffect } from "react"
import { create } from "zustand"

export type UpdateStatus =
  | "checking"
  | "up-to-date"
  | "update-available"
  | "downloading"
  | "downloaded"
  | "error"

interface UpdateState {
  status: UpdateStatus
  currentVersion: string
  latestVersion: string | null
  downloadProgress: number | null
  error: string | null
  logs: string[]
  checkForUpdates: () => Promise<void>
  downloadUpdate: () => Promise<void>
  quitAndInstall: () => Promise<void>
  initialize: () => void
  addLog: (message: string) => void
  clearLogs: () => void
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: "checking",
  currentVersion: "0.0.1",
  latestVersion: null,
  downloadProgress: null,
  error: null,
  logs: [],

  initialize: () => {
    // Get current version
    window.api.app.getVersion().then((version) => {
      set({ currentVersion: version })
    })

    // Set up event listeners
    window.api.updater.onCheckingForUpdate(() => {
      set({ status: "checking", error: null })
    })

    window.api.updater.onUpdateAvailable((info) => {
      console.log("[UpdateStore] Update available:", info)
      const currentStatus = get().status
      // Only update status if we're checking - prevents race conditions and layout shifts
      // If already in update-available, just ensure latestVersion is set
      if (currentStatus === "checking") {
        set({
          status: "update-available",
          latestVersion: info.version,
          error: null,
        })
      } else if (currentStatus !== "update-available") {
        // If in some other state, update to update-available
        set({
          status: "update-available",
          latestVersion: info.version,
          error: null,
        })
      } else {
        // Already in update-available, just ensure latestVersion is set
        set({ latestVersion: info.version })
      }
    })

    window.api.updater.onUpdateNotAvailable(() => {
      set({ status: "up-to-date", latestVersion: null, error: null })
    })

    window.api.updater.onUpdateDownloaded(() => {
      set({ status: "downloaded", downloadProgress: 100 })
    })

    window.api.updater.onUpdateError((error) => {
      console.error("[UpdateStore] Update error event:", error)
      set({
        status: "error",
        error: error.message,
      })
    })

    window.api.updater.onDownloadProgress((progress) => {
      set({
        status: "downloading",
        downloadProgress: progress.percent,
      })
    })

    // Listen for logs from main process
    window.api.updater.onLog((message) => {
      get().addLog(message)
    })

    // Initial check
    get().checkForUpdates()
  },

  addLog: (message: string) => {
    set((state) => ({
      logs: [...state.logs.slice(-19), message], // Keep last 20 logs
    }))
  },

  clearLogs: () => {
    set({ logs: [] })
  },

  checkForUpdates: async () => {
    try {
      set({ status: "checking", error: null })
      const logMsg = "[UpdateStore] Checking for updates..."
      console.log(logMsg)
      get().addLog(logMsg)

      const result = await window.api.updater.checkForUpdates()
      const resultMsg = `[UpdateStore] Check result: ${JSON.stringify(result)}`
      console.log(resultMsg)
      get().addLog(resultMsg)

      if (result.error) {
        const errorMsg = `[UpdateStore] Update check error: ${result.error}`
        console.error(errorMsg)
        get().addLog(errorMsg)
        set({ status: "error", error: result.error })
        return
      }

      // Only update state if event listeners haven't already set it
      // This prevents race conditions where the event fires before this completes
      const currentStatus = get().status

      if (result.available && result.latestVersion) {
        const availableMsg = `[UpdateStore] Update available: ${result.latestVersion}`
        console.log(availableMsg)
        get().addLog(availableMsg)
        // Only set if not already set by event listener
        if (currentStatus !== "update-available") {
          set({
            status: "update-available",
            latestVersion: result.latestVersion,
          })
        } else {
          // Just ensure latestVersion is set
          set({ latestVersion: result.latestVersion })
        }
      } else {
        // Only set to up-to-date if event listener hasn't already set update-available
        if (currentStatus === "checking") {
          const upToDateMsg = "[UpdateStore] Up to date"
          console.log(upToDateMsg)
          get().addLog(upToDateMsg)
          set({ status: "up-to-date", latestVersion: null })
        }
      }
    } catch (error) {
      const errorMsg = `[UpdateStore] Check failed: ${error instanceof Error ? error.message : "Unknown error"}`
      console.error(errorMsg)
      get().addLog(errorMsg)
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  },

  downloadUpdate: async () => {
    try {
      // Ensure we've checked for updates first
      const currentStatus = get().status
      if (currentStatus !== "update-available") {
        const warnMsg = `[UpdateStore] Cannot download - status is not 'update-available': ${currentStatus}`
        console.warn(warnMsg)
        get().addLog(warnMsg)
        set({
          status: "error",
          error: "Please check for updates first",
        })
        return
      }

      const startMsg = "[UpdateStore] Starting download..."
      console.log(startMsg)
      get().addLog(startMsg)
      set({ status: "downloading", downloadProgress: 0, error: null })
      const result = await window.api.updater.downloadUpdate()
      const resultMsg = `[UpdateStore] Download result: ${JSON.stringify(result)}`
      console.log(resultMsg)
      get().addLog(resultMsg)

      if (!result.success && result.error) {
        const errorMsg = `[UpdateStore] Download error: ${result.error}`
        console.error(errorMsg)
        get().addLog(errorMsg)
        set({ status: "error", error: result.error })
      }
      // Download progress and completion will be handled by event listeners
    } catch (error) {
      const errorMsg = `[UpdateStore] Download failed: ${error instanceof Error ? error.message : "Unknown error"}`
      console.error(errorMsg)
      get().addLog(errorMsg)
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  },

  quitAndInstall: async () => {
    await window.api.updater.quitAndInstall()
  },
}))

// Hook to initialize update store on mount
export const useUpdateInitializer = () => {
  const initialize = useUpdateStore((state) => state.initialize)

  useEffect(() => {
    initialize()

    // Cleanup listeners on unmount
    return () => {
      window.api.updater.removeAllListeners("updater:checking-for-update")
      window.api.updater.removeAllListeners("updater:update-available")
      window.api.updater.removeAllListeners("updater:update-not-available")
      window.api.updater.removeAllListeners("updater:update-downloaded")
      window.api.updater.removeAllListeners("updater:error")
      window.api.updater.removeAllListeners("updater:download-progress")
    }
  }, [initialize])
}
