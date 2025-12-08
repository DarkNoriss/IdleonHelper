import { electronAPI } from "@electron-toolkit/preload"
import { contextBridge, ipcRenderer } from "electron"

// Custom APIs for renderer
const api = {
  window: {
    close: () => ipcRenderer.send("window-close"),
  },
  world3: {
    processJson: (jsonString: string) =>
      ipcRenderer.invoke("world-3-construction:process-json", jsonString),
  },
  app: {
    getVersion: () => ipcRenderer.invoke("app:get-version"),
  },
  updater: {
    checkForUpdates: () => ipcRenderer.invoke("updater:check-for-updates"),
    downloadUpdate: () => ipcRenderer.invoke("updater:download-update"),
    quitAndInstall: () => ipcRenderer.invoke("updater:quit-and-install"),
    onUpdateAvailable: (callback: (info: { version: string }) => void) => {
      ipcRenderer.on("updater:update-available", (_, info) => callback(info))
    },
    onUpdateNotAvailable: (callback: () => void) => {
      ipcRenderer.on("updater:update-not-available", () => callback())
    },
    onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
      ipcRenderer.on("updater:update-downloaded", (_, info) => callback(info))
    },
    onUpdateError: (callback: (error: { message: string }) => void) => {
      ipcRenderer.on("updater:error", (_, error) => callback(error))
    },
    onDownloadProgress: (
      callback: (progress: {
        percent: number
        transferred: number
        total: number
      }) => void
    ) => {
      ipcRenderer.on("updater:download-progress", (_, progress) =>
        callback(progress)
      )
    },
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel)
    },
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI)
    contextBridge.exposeInMainWorld("api", api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
