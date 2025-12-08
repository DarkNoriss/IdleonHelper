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
  checkForUpdates: () => Promise<void>
  downloadUpdate: () => Promise<void>
  quitAndInstall: () => Promise<void>
  initialize: () => void
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: "checking",
  currentVersion: "0.0.1",
  latestVersion: null,
  downloadProgress: null,
  error: null,

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
      set({
        status: "update-available",
        latestVersion: info.version,
        error: null,
      })
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

    // Initial check
    get().checkForUpdates()
  },

  checkForUpdates: async () => {
    try {
      set({ status: "checking", error: null })
      console.log("[UpdateStore] Checking for updates...")
      const result = await window.api.updater.checkForUpdates()
      console.log("[UpdateStore] Check result:", result)

      if (result.error) {
        console.error("[UpdateStore] Update check error:", result.error)
        set({ status: "error", error: result.error })
        return
      }

      if (result.available && result.latestVersion) {
        console.log("[UpdateStore] Update available:", result.latestVersion)
        set({
          status: "update-available",
          latestVersion: result.latestVersion,
        })
      } else {
        console.log("[UpdateStore] Up to date")
        set({ status: "up-to-date", latestVersion: null })
      }
    } catch (error) {
      console.error("[UpdateStore] Check failed:", error)
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  },

  downloadUpdate: async () => {
    try {
      console.log("[UpdateStore] Starting download...")
      set({ status: "downloading", downloadProgress: 0, error: null })
      const result = await window.api.updater.downloadUpdate()
      console.log("[UpdateStore] Download result:", result)

      if (!result.success && result.error) {
        console.error("[UpdateStore] Download error:", result.error)
        set({ status: "error", error: result.error })
      }
      // Download progress and completion will be handled by event listeners
    } catch (error) {
      console.error("[UpdateStore] Download failed:", error)
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
