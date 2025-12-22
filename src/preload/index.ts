import { electronAPI } from "@electron-toolkit/preload"
import { contextBridge, ipcRenderer } from "electron"

const api = {
  window: {
    close: () => {
      ipcRenderer.send("window-close")
    },
  },
  backend: {
    getStatus: () => {
      return ipcRenderer.invoke("backend:getStatus")
    },
    onStatusChange: (
      callback: (status: { status: string; error: string | null }) => void
    ) => {
      ipcRenderer.on("backend-status-changed", (_event, status) =>
        callback(status)
      )
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
    world2: {
      weeklyBattle: {
        fetch: () => {
          return ipcRenderer.invoke("script:world2.weekly-battle.fetch")
        },
        get: () => {
          return ipcRenderer.invoke("script:world2.weekly-battle.get")
        },
        onChange: (callback: (data: unknown) => void) => {
          ipcRenderer.on("weekly-battle-data-changed", (_event, data) =>
            callback(data)
          )
          return () => {
            ipcRenderer.removeAllListeners("weekly-battle-data-changed")
          }
        },
      },
    },
  },
}

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
