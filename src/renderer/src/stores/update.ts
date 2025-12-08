import { useEffect } from "react"
import { create } from "zustand"

export type UpdateStatus =
  | "idle"
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
  status: "idle",
  currentVersion: "0.0.0",
  latestVersion: null,
  downloadProgress: null,
  error: null,

  initialize: () => {
    // Get current version
    window.api.app.getVersion().then((version) => {
      set({ currentVersion: version })
    })

    // Event listeners - these are the source of truth for status updates
    window.api.updater.onUpdateAvailable((info) => {
      set({
        status: "update-available",
        latestVersion: info.version,
        error: null,
      })
    })

    window.api.updater.onUpdateNotAvailable(() => {
      set({ status: "up-to-date", error: null })
    })

    window.api.updater.onUpdateDownloaded(() => {
      set({ status: "downloaded", downloadProgress: 100 })
    })

    window.api.updater.onUpdateError((error) => {
      set({ status: "error", error: error.message })
    })

    window.api.updater.onDownloadProgress((progress) => {
      set({ status: "downloading", downloadProgress: progress.percent })
    })

    // Do initial check on startup
    get().checkForUpdates()
  },

  checkForUpdates: async () => {
    const { status } = get()
    // Don't check if already checking or downloading
    if (status === "checking" || status === "downloading") return

    try {
      set({ status: "checking", error: null })
      const result = await window.api.updater.checkForUpdates()

      if (result.error) {
        set({ status: "error", error: result.error })
        return
      }

      // Update state based on result (events may also fire, but this ensures consistency)
      if (result.available && result.latestVersion) {
        set({ status: "update-available", latestVersion: result.latestVersion })
      } else {
        set({ status: "up-to-date" })
      }
    } catch (error) {
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  },

  downloadUpdate: async () => {
    const { status } = get()
    if (status !== "update-available") return

    try {
      set({ status: "downloading", downloadProgress: 0, error: null })
      const result = await window.api.updater.downloadUpdate()

      if (!result.success && result.error) {
        set({ status: "error", error: result.error })
      }
      // Success state will be set by onUpdateDownloaded event
    } catch (error) {
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
export const useUpdateInitializer = (): void => {
  const initialize = useUpdateStore((state) => state.initialize)

  useEffect(() => {
    initialize()

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
