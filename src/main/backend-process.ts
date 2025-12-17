import { ChildProcess, spawn } from "child_process"
import { join } from "path"
import { is } from "@electron-toolkit/utils"

let backendProcess: ChildProcess | null = null

export interface BackendProcessInfo {
  process: ChildProcess | null
  port: number
  isRunning: boolean
}

const getBackendPath = (): string => {
  if (is.dev) {
    return join(
      process.cwd(),
      "resources",
      "backend",
      "IdleonHelperBackend.exe"
    )
  } else {
    return join(process.resourcesPath, "backend", "IdleonHelperBackend.exe")
  }
}

/**
 * Starts the backend process asynchronously without blocking
 * @returns Promise that resolves when the backend process is spawned (not necessarily ready)
 */
export async function startBackend(): Promise<BackendProcessInfo> {
  if (backendProcess && !backendProcess.killed) {
    return {
      process: backendProcess,
      port: 5000, // Default port, adjust if needed
      isRunning: true,
    }
  }

  if (process.platform !== "win32") {
    throw new Error("Backend only supports Windows")
  }

  const backendPath = getBackendPath()
  if (!backendPath) {
    throw new Error("Backend executable path not found")
  }

  console.log("Connecting backend...")

  return new Promise((resolve, reject) => {
    try {
      backendProcess = spawn(backendPath, [], {
        stdio: "ignore",
        detached: false,
      })

      backendProcess.on("exit", () => {
        backendProcess = null
      })

      backendProcess.on("error", (error) => {
        console.error("Backend error:", error.message)
        backendProcess = null
        reject(error)
      })

      // Small delay to check if process starts successfully
      setTimeout(() => {
        if (backendProcess && !backendProcess.killed) {
          console.log("Backend connected")
          resolve({
            process: backendProcess,
            port: 5000,
            isRunning: true,
          })
        } else {
          reject(new Error("Backend process failed to start"))
        }
      }, 100)
    } catch (error) {
      console.error(
        "Backend error:",
        error instanceof Error ? error.message : String(error)
      )
      reject(error)
    }
  })
}

/**
 * Stops the backend process
 */
export function stopBackend(): void {
  if (backendProcess && !backendProcess.killed) {
    try {
      if (process.platform === "win32") {
        backendProcess.kill()
      } else {
        backendProcess.kill("SIGTERM")
        setTimeout(() => {
          if (backendProcess && !backendProcess.killed) {
            backendProcess.kill("SIGKILL")
          }
        }, 2000)
      }
    } catch (error) {
      console.error(
        "Backend error:",
        error instanceof Error ? error.message : String(error)
      )
    }
    backendProcess = null
  }
}

/**
 * Gets the current backend process info
 */
export function getBackendProcess(): BackendProcessInfo | null {
  if (!backendProcess) {
    return null
  }

  return {
    process: backendProcess,
    port: 5000,
    isRunning: !backendProcess.killed,
  }
}
