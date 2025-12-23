import { getMainWindow } from "./index"
import { logger } from "./logger"

type CancellationToken = {
  isCancelled: () => boolean
  cancel: () => void
  throwIfCancelled: () => void
}

// Global state
let currentToken: CancellationToken | null = null
let isWorking = false

const notifyStatusChange = (): void => {
  const mainWindow = getMainWindow()
  if (mainWindow) {
    mainWindow.webContents.send("script-status-changed", { isWorking })
  }
}

const createCancellationToken = (): CancellationToken => {
  let cancelled = false

  return {
    isCancelled: () => cancelled,
    cancel: () => {
      cancelled = true
    },
    throwIfCancelled: () => {
      if (cancelled) {
        throw new Error("Operation was cancelled")
      }
    },
  }
}

/**
 * Delays execution for the specified number of milliseconds, checking for cancellation periodically.
 * Similar to C#'s Task.Delay(ms, cancellationToken).
 * @param milliseconds - The number of milliseconds to delay
 * @param token - The cancellation token to check during the delay
 * @throws {Error} If the operation is cancelled, throws "Operation was cancelled"
 */
export const delay = async (
  milliseconds: number,
  token: CancellationToken
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (checkIntervalId) clearInterval(checkIntervalId)
      if (token.isCancelled()) {
        reject(new Error("Operation was cancelled"))
      } else {
        resolve()
      }
    }, milliseconds)

    // Check for cancellation periodically
    const checkIntervalId = setInterval(() => {
      if (token.isCancelled()) {
        clearTimeout(timeoutId)
        clearInterval(checkIntervalId)
        reject(new Error("Operation was cancelled"))
      }
    }, 100) // Check every 100ms
  })
}

export const cancellationManager = {
  createToken: (): CancellationToken => {
    // Cancel any existing token
    if (currentToken) {
      currentToken.cancel()
    }

    // Create new token
    const token = createCancellationToken()
    currentToken = token
    isWorking = true
    logger.log("Operation started (cancellation token created)")
    notifyStatusChange()

    return token
  },

  cancelCurrent: (): void => {
    if (currentToken) {
      currentToken.cancel()
      currentToken = null
      isWorking = false
      logger.log("Operation cancelled")
      notifyStatusChange()
    }
  },

  clearToken: (): void => {
    currentToken = null
    isWorking = false
    logger.log("Operation completed (cancellation token cleared)")
    notifyStatusChange()
  },

  getStatus: (): { isWorking: boolean } => {
    return { isWorking }
  },

  getCurrentToken: (): CancellationToken | null => {
    return currentToken
  },
} as const
