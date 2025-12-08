import { create } from "zustand"

export interface WSMessage {
  type: string
  source: string
  data?: unknown
}

interface MessageHandler {
  source: string
  handler: (msg: WSMessage) => void
}

interface WebSocketState {
  ws: WebSocket | null
  isConnected: boolean
  error: string | null
  connect: () => void
  disconnect: () => void
  send: (message: { type: string; source: string; data?: unknown }) => void
  clearError: () => void
  subscribe: (source: string, handler: (msg: WSMessage) => void) => () => void
}

const WS_URL = "ws://localhost:5000/ws"

// Store message handlers outside the store to persist across re-renders
const handlers: MessageHandler[] = []

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  ws: null,
  isConnected: false,
  error: null,

  connect: () => {
    const { ws } = get()
    if (ws && ws.readyState === WebSocket.OPEN) {
      return // Already connected
    }

    if (ws) {
      ws.close() // Close existing connection if any
    }

    const newWs = new WebSocket(WS_URL)

    newWs.onopen = () => {
      set({ isConnected: true, error: null })
    }

    newWs.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)

        console.log("Received message:", message)

        // Call handlers that match the message source
        handlers.forEach(({ source, handler }) => {
          if (source === message.source) {
            try {
              handler(message)
            } catch (error) {
              console.error("Error in WebSocket message handler:", error)
            }
          }
        })
      } catch (error) {
        console.error("Error parsing WebSocket message:", error)
        set({
          error: "Failed to parse WebSocket message",
        })
      }
    }

    newWs.onerror = () => {
      set({
        isConnected: false,
        error:
          "Failed to connect to WebSocket server. Make sure the server is running on ws://localhost:5000/ws",
      })
    }

    newWs.onclose = () => {
      set({ isConnected: false })
      set({ ws: null })
    }

    set({ ws: newWs })
  },

  disconnect: () => {
    const { ws } = get()
    if (ws) {
      ws.close(1000, "Client disconnect")
      set({ ws: null, isConnected: false })
    }
  },

  send: (message: { type: string; source: string; data?: unknown }) => {
    const { ws, isConnected } = get()
    if (ws && isConnected && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    } else {
      set({ error: "WebSocket is not connected" })
    }
  },

  clearError: () => {
    set({ error: null })
  },

  subscribe: (source: string, handler: (msg: WSMessage) => void) => {
    const messageHandler: MessageHandler = { source, handler }
    handlers.push(messageHandler)

    return () => {
      const index = handlers.indexOf(messageHandler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  },
}))
