import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, type IpcRendererEvent, ipcRenderer } from "electron";

const api = {
  window: {
    close: () => {
      ipcRenderer.send("window-close");
    },
  },
  backend: {
    getStatus: () => {
      return ipcRenderer.invoke("backend:getStatus");
    },
    onStatusChange: (
      callback: (status: { status: string; error: string | null }) => void
    ) => {
      const handler = (
        _event: IpcRendererEvent,
        status: { status: string; error: string | null }
      ) => {
        callback(status);
      };
      ipcRenderer.on("backend-status-changed", handler);
      return () => {
        ipcRenderer.off("backend-status-changed", handler);
      };
    },
  },
  script: {
    run: (id: string, ...args: unknown[]) => {
      return ipcRenderer.invoke(`script:${id}`, ...args);
    },
    cancel: () => {
      return ipcRenderer.invoke("script:cancel");
    },
    // Legacy: weekly battle data ops (will move to state.* in Phase 2)
    world2: {
      weeklyBattle: {
        fetch: () => {
          return ipcRenderer.invoke("script:world-2.weekly-battle.fetch");
        },
        get: () => {
          return ipcRenderer.invoke("script:world-2.weekly-battle.get");
        },
        onChange: (callback: (data: unknown) => void) => {
          const handler = (_event: IpcRendererEvent, data: unknown) => {
            callback(data);
          };
          ipcRenderer.on("weekly-battle-data-changed", handler);
          return () => {
            ipcRenderer.off("weekly-battle-data-changed", handler);
          };
        },
      },
    },
    // Legacy: construction solver (not a defineScript, stays as specific handler)
    world3: {
      construction: {
        solver: (
          inventory: unknown,
          weights: { buildRate: number; exp: number; flaggy: number },
          solveTime?: number
        ) => {
          return ipcRenderer.invoke(
            "script:world-3.construction.solver",
            inventory,
            weights,
            solveTime
          );
        },
      },
    },
    // Legacy: status change listener (will move to state.* in Phase 2)
    onStatusChange: (callback: (status: { isWorking: boolean }) => void) => {
      const handler = (
        _event: IpcRendererEvent,
        status: { isWorking: boolean }
      ) => {
        callback(status);
      };
      ipcRenderer.on("script-status-changed", handler);
      return () => {
        ipcRenderer.off("script-status-changed", handler);
      };
    },
  },
  app: {
    isDev: () => {
      return ipcRenderer.invoke("app:isDev");
    },
  },
  update: {
    getVersion: () => {
      return ipcRenderer.invoke("update:get-version");
    },
    checkForUpdates: () => {
      return ipcRenderer.invoke("update:check");
    },
    downloadUpdate: () => {
      return ipcRenderer.invoke("update:download");
    },
    installUpdate: () => {
      return ipcRenderer.invoke("update:install");
    },
    getStatus: () => {
      return ipcRenderer.invoke("update:get-status");
    },
    onStatusChange: (
      callback: (status: {
        version: string;
        status: string;
        error?: string;
      }) => void
    ) => {
      const handler = (
        _event: IpcRendererEvent,
        status: { version: string; status: string; error?: string }
      ) => {
        callback(status);
      };
      ipcRenderer.on("update-status-changed", handler);
      return () => {
        ipcRenderer.off("update-status-changed", handler);
      };
    },
    onDownloadProgress: (
      callback: (progress: {
        percent: number;
        transferred: number;
        total: number;
      }) => void
    ) => {
      const handler = (
        _event: IpcRendererEvent,
        progress: { percent: number; transferred: number; total: number }
      ) => {
        callback(progress);
      };
      ipcRenderer.on("update-download-progress", handler);
      return () => {
        ipcRenderer.off("update-download-progress", handler);
      };
    },
  },
  logs: {
    get: () => {
      return ipcRenderer.invoke("logs:get");
    },
    onChange: (callback: (logs: unknown[]) => void) => {
      const handler = (_event: IpcRendererEvent, logs: unknown[]) => {
        callback(logs);
      };
      ipcRenderer.on("logs-changed", handler);
      return () => {
        ipcRenderer.off("logs-changed", handler);
      };
    },
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI;
  // @ts-expect-error (define in dts)
  window.api = api;
}
