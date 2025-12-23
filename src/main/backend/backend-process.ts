import { ChildProcess, spawn } from "child_process"
import { existsSync } from "fs"
import { join } from "path"
import { is } from "@electron-toolkit/utils"

import { logger } from "../utils"

const BACKEND_PORT = 5000
const BACKEND_EXECUTABLE = "IdleonHelperBackend.exe"
const STARTUP_CHECK_DELAY = 100
const GRACEFUL_SHUTDOWN_TIMEOUT = 2000

export type BackendProcessInfo = {
  process: ChildProcess
  port: number
  isRunning: boolean
}

let backendProcess: ChildProcess | null = null

const getExecutablePath = (): string => {
  const basePath = is.dev
    ? join(process.cwd(), "resources", "backend")
    : join(process.resourcesPath, "backend")

  return join(basePath, BACKEND_EXECUTABLE)
}

const validatePlatform = (): void => {
  if (process.platform !== "win32") {
    logger.error(
      "Platform validation failed: Backend only supports Windows platform"
    )
    throw new Error("Backend only supports Windows platform")
  }
}

const validateExecutable = (path: string): void => {
  if (!existsSync(path)) {
    logger.error(
      `Executable validation failed: Backend executable not found at: ${path}`
    )
    throw new Error(`Backend executable not found at: ${path}`)
  }
}

const isRunning = (): boolean => {
  return backendProcess !== null && !backendProcess.killed
}

const cleanup = (): void => {
  backendProcess = null
}

const setupProcessHandlers = (process: ChildProcess): void => {
  process.on("exit", () => {
    cleanup()
  })

  process.on("error", () => {
    cleanup()
  })
}

const spawnProcess = (execPath: string): Promise<BackendProcessInfo> => {
  return new Promise((resolve, reject) => {
    try {
      logger.log(`Starting backend process: ${execPath}`)
      backendProcess = spawn(execPath, [], {
        stdio: "ignore",
        detached: false,
        windowsHide: true,
      })

      setupProcessHandlers(backendProcess)

      setTimeout(() => {
        if (isRunning()) {
          logger.log(
            `Backend process started successfully on port ${BACKEND_PORT}`
          )
          resolve({
            process: backendProcess!,
            port: BACKEND_PORT,
            isRunning: true,
          })
        } else {
          logger.error("Backend process failed to start")
          reject(new Error("Backend process failed to start"))
        }
      }, STARTUP_CHECK_DELAY)
    } catch (error) {
      cleanup()
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to spawn backend process: ${message}`)
      reject(new Error(`Failed to spawn backend: ${message}`))
    }
  })
}

const gracefulShutdown = (process: ChildProcess): void => {
  logger.log("Attempting graceful shutdown of backend process")
  process.kill("SIGTERM")

  setTimeout(() => {
    if (backendProcess && !backendProcess.killed) {
      logger.warn("Backend didn't stop gracefully, forcing shutdown")
      backendProcess.kill("SIGKILL")
    }
  }, GRACEFUL_SHUTDOWN_TIMEOUT)
}

export const startBackend = async (): Promise<BackendProcessInfo> => {
  if (isRunning()) {
    return {
      process: backendProcess!,
      port: BACKEND_PORT,
      isRunning: true,
    }
  }

  validatePlatform()
  const execPath = getExecutablePath()
  validateExecutable(execPath)

  return spawnProcess(execPath)
}

export const stopBackend = (): void => {
  if (!backendProcess || backendProcess.killed) return

  logger.log("Stopping backend process")
  try {
    if (process.platform === "win32") {
      backendProcess.kill()
      logger.log("Backend process stopped")
    } else {
      gracefulShutdown(backendProcess)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to stop backend: ${message}`)
  } finally {
    cleanup()
  }
}

export const getBackendProcess = (): BackendProcessInfo | null => {
  if (!backendProcess) return null

  return {
    process: backendProcess,
    port: BACKEND_PORT,
    isRunning: !backendProcess.killed,
  }
}

export const isBackendRunning = (): boolean => isRunning()
