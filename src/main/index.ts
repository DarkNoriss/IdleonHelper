import { join } from "node:path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, shell } from "electron";

import { closeConnection, stopBackend } from "./backend/index";
import { setupHandlers } from "./handlers";
import { initializeApp } from "./initialization";
import { setMainWindow } from "./main-window";
import { setSolverLogger } from "./scripts/world3/construction/solver-logger";
import { logger, setLogsChangeNotifier } from "./utils/index";

function createWindow(): void {
  logger.log("Creating main window");
  const window = new BrowserWindow({
    width: 958,
    height: 570,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(import.meta.dirname, "../preload/index.js"),
      sandbox: false,
      devTools: true,
    },
  });

  setMainWindow(window);

  // Set up log change notifier for real-time updates
  setLogsChangeNotifier((logs) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send("logs-changed", logs);
    }
  });

  window.on("ready-to-show", () => {
    window?.show();
  });

  window.on("closed", () => {
    setMainWindow(null);
  });

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    window.loadFile(join(import.meta.dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  logger.log("Electron app ready");
  electronApp.setAppUserModelId("com.idleon.helper");

  setSolverLogger({
    log: (m) => logger.log(m),
    info: (m) => logger.info(m),
    warn: (m) => logger.warn(m),
    error: (m) => logger.error(m),
  });

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  setupHandlers();
  // Initialize app in background (fire-and-forget) to avoid blocking window creation
  setImmediate(() => {
    initializeApp();
  });
});

app.on("window-all-closed", () => {
  logger.log("All windows closed, shutting down...");
  closeConnection();
  stopBackend();
  app.quit();
});

app.on("before-quit", () => {
  logger.log("App quitting...");
  closeConnection();
  stopBackend();
});

app.on("will-quit", async () => {
  if (!app.isPackaged) {
    try {
      const { stopLogFileSink } = await import("./dev/log-file-sink");
      const { stopDevServer } = await import("./dev/command-server");
      const { unregisterPanicHotkey } = await import("./dev/panic-exit");
      stopLogFileSink();
      stopDevServer();
      unregisterPanicHotkey();
    } catch {
      // Modules may not have loaded; ignore.
    }
  }
});
