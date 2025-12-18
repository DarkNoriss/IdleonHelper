import { randomUUID } from "crypto"
import WebSocket from "ws"

import { startBackend } from "./backend-process"
import type {
  CommandRequestMap,
  CommandResponseMap,
  WebSocketCommandMessage,
  WebSocketResponse,
} from "./backend-types"

const BACKEND_PORT = 5000
const WS_URL = `ws://localhost:${BACKEND_PORT}/ws`
const CONNECTION_TIMEOUT = 500
const MAX_RETRIES = 30
const RETRY_DELAY = 1000
const COMMAND_TIMEOUT = 30000

type MessageHandler = {
  resolve: (data: unknown) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}

export type ConnectionStatus = "connecting" | "connected" | "error"

let ws: WebSocket | null = null
let isConnecting = false
let connectionStatus: ConnectionStatus = "connecting"
let lastError: string | null = null
const messageHandlers = new Map<string, MessageHandler>()

// Status change callback
type StatusChangeCallback = (
  status: ConnectionStatus,
  error: string | null
) => void
let statusChangeCallback: StatusChangeCallback | null = null

export const onStatusChange = (callback: StatusChangeCallback): void => {
  statusChangeCallback = callback
  // Immediately notify with current status
  callback(connectionStatus, lastError)
}

const notifyStatusChange = (): void => {
  if (statusChangeCallback) {
    statusChangeCallback(connectionStatus, lastError)
  }
}

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const getStateText = (): string => {
  const state = ws?.readyState
  return state === WebSocket.CONNECTING
    ? "CONNECTING"
    : state === WebSocket.OPEN
      ? "OPEN"
      : state === WebSocket.CLOSING
        ? "CLOSING"
        : state === WebSocket.CLOSED
          ? "CLOSED"
          : "UNKNOWN"
}

const cleanup = (): void => {
  messageHandlers.forEach(({ timeout }) => clearTimeout(timeout))
  messageHandlers.clear()
  ws = null
  connectionStatus = "connecting"
  lastError = null
}

const testConnection = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const testWs = new WebSocket(WS_URL)
    const timeout = setTimeout(() => {
      testWs.close()
      resolve(false)
    }, CONNECTION_TIMEOUT)

    testWs.once("open", () => {
      clearTimeout(timeout)
      testWs.close()
      resolve(true)
    })

    testWs.once("error", () => {
      clearTimeout(timeout)
      resolve(false)
    })
  })
}

const waitForBackend = async (): Promise<void> => {
  connectionStatus = "connecting"
  notifyStatusChange()
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (await testConnection()) return
    await sleep(RETRY_DELAY)
  }
  connectionStatus = "error"
  lastError = "Backend failed to start"
  notifyStatusChange()
  throw new Error(lastError)
}

/**
 * Converts PascalCase response data to camelCase to match TypeScript types
 * Also filters out C#-specific properties like IsEmpty from Point objects
 */
const convertResponseToCamelCase = (data: unknown): unknown => {
  if (!data || typeof data !== "object") return data

  if (Array.isArray(data)) {
    return data.map((item) => convertResponseToCamelCase(item))
  }

  const converted: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    // Skip C# Point.IsEmpty property (not in our TypeScript Point type)
    if (key === "IsEmpty" || key === "isEmpty") continue

    // Convert PascalCase to camelCase
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1)
    converted[camelKey] =
      value && typeof value === "object"
        ? convertResponseToCamelCase(value)
        : value
  }
  return converted
}

const handleMessage = (data: Buffer): void => {
  try {
    const response = JSON.parse(data.toString()) as WebSocketResponse<unknown>

    // Ignore messages without id (they're not command responses)
    if (!response.id) {
      return
    }

    const handler = messageHandlers.get(response.id)
    if (!handler) {
      // Handler not found - might be a duplicate or already handled
      return
    }

    clearTimeout(handler.timeout)
    messageHandlers.delete(response.id)

    if (response.type === "error") {
      handler.reject(new Error(response.error || "Unknown error"))
    } else {
      // Convert PascalCase response data to camelCase
      const convertedData = convertResponseToCamelCase(response.data)
      handler.resolve(convertedData)
    }
  } catch (error) {
    console.error("Failed to parse message:", error)
  }
}

const setupMessageHandler = (): void => {
  if (!ws) return
  ws.on("message", handleMessage)
}

const setupWebSocket = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!ws) return reject(new Error("WebSocket is null"))

    ws.once("open", () => {
      connectionStatus = "connected"
      lastError = null
      setupMessageHandler()
      notifyStatusChange()
      resolve()
    })

    ws.once("error", (error) => {
      connectionStatus = "error"
      lastError = error.message
      notifyStatusChange()
      reject(error)
    })

    ws.on("close", () => {
      // If we were connected and now closing, it's an error
      const wasConnected = connectionStatus === "connected"
      cleanup()
      if (wasConnected) {
        connectionStatus = "error"
        lastError = "Connection closed unexpectedly"
      }
      notifyStatusChange()
    })
  })
}

const connect = async (): Promise<void> => {
  if (ws?.readyState === WebSocket.OPEN) return
  if (isConnecting) return

  isConnecting = true
  connectionStatus = "connecting"
  notifyStatusChange()

  try {
    ws = new WebSocket(WS_URL)
    await setupWebSocket()
  } catch (error) {
    connectionStatus = "error"
    lastError = error instanceof Error ? error.message : String(error)
    notifyStatusChange()
    throw error
  } finally {
    isConnecting = false
  }
}

export const initializeBackend = async (): Promise<void> => {
  await startBackend()
  await waitForBackend()
  await connect()
}

export const sendCommand = async <T extends keyof CommandRequestMap>(
  command: T,
  data: CommandRequestMap[T],
  id?: string
): Promise<CommandResponseMap[T]> => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error(`WebSocket not connected (state: ${getStateText()})`)
  }

  const messageId = id || randomUUID()
  // Backend expects PascalCase property names (Id, Command, Data)
  const message: WebSocketCommandMessage<T> = {
    Id: messageId,
    Command: command,
    Data: data,
  }
  const messageJson = JSON.stringify(message)

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      messageHandlers.delete(messageId)
      reject(new Error("Command timeout"))
    }, COMMAND_TIMEOUT)

    messageHandlers.set(messageId, {
      resolve: resolve as (data: unknown) => void,
      reject,
      timeout,
    })

    ws!.send(messageJson)
  })
}

export const closeConnection = (): void => {
  cleanup()
  ws?.close()
}

export const isConnected = (): boolean => {
  return ws?.readyState === WebSocket.OPEN
}

export const getConnectionStatus = (): ConnectionStatus => {
  return connectionStatus
}

export const getLastError = (): string | null => {
  return lastError
}
