import { electronAPI } from "@electron-toolkit/preload"
import { contextBridge, ipcRenderer } from "electron"

// Custom APIs for renderer
const api = {
  window: {
    close: () => {
      ipcRenderer.send("window-close")
    },
  },
  backend: {
    onStatusChange: (
      callback: (status: { status: string; error: string | null }) => void
    ) => {
      ipcRenderer.on("backend-status-changed", (_event, status) =>
        callback(status)
      )
      // Return cleanup function
      return () => {
        ipcRenderer.removeAllListeners("backend-status-changed")
      }
    },
  },
  script: {
    navigation: {
      ui: {
        toCodex: () => {
          return ipcRenderer.invoke("script:navigation.ui.toCodex")
        },
        toItems: () => {
          return ipcRenderer.invoke("script:navigation.ui.toItems")
        },
      },
    },
  },
  weeklyBattle: {
    get: () => {
      return ipcRenderer.invoke("weekly-battle:get")
    },
    fetch: () => {
      return ipcRenderer.invoke("weekly-battle:fetch")
    },
    onDataChange: (
      callback: (data: unknown) => void
    ) => {
      ipcRenderer.on("weekly-battle-data-changed", (_event, data) =>
        callback(data)
      )
      // Return cleanup function
      return () => {
        ipcRenderer.removeAllListeners("weekly-battle-data-changed")
      }
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
  // @ts-expect-error (define in dts)
  window.electron = electronAPI
  // @ts-expect-error (define in dts)
  window.api = api
}
