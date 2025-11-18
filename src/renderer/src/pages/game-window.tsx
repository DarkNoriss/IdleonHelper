import * as React from "react"
import { useWebSocketStore, type WSMessage } from "@/stores/ws"

import { Button } from "@/components/ui/button"

const SOURCE = "test"

export const GameWindow = (): React.ReactElement => {
  const { isConnected, error, send, subscribe } = useWebSocketStore()

  const [testMessage, setTestMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    const unsubscribe = subscribe(SOURCE, (msg: WSMessage) => {
      setTestMessage(
        `Test received: ${msg.type} - ${JSON.stringify(msg.data || "")}`
      )
    })

    return () => {
      unsubscribe()
    }
  }, [subscribe])

  const handleSendPing = (): void => {
    send({ type: "ping", source: SOURCE })
  }

  const handleTestCaptureScreenshot = (): void => {
    send({ type: "test-capture-screenshot", source: SOURCE })
  }

  const displayMessage = (): string => {
    if (error) return `Error: ${error}`
    if (testMessage) return testMessage
    if (isConnected) return "Connected to WebSocket server"
    return "Waiting for connection..."
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Game Window</h1>
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
          <Button onClick={handleSendPing} disabled={!isConnected}>
            Send Ping
          </Button>
          <Button onClick={handleTestCaptureScreenshot} disabled={!isConnected}>
            Test Capture Screenshot
          </Button>
        </div>
        <div className="mt-4 min-h-[100px] min-w-[300px] rounded-lg border p-4">
          <p className="text-muted-foreground mb-2 text-sm">
            Status: {isConnected ? "Connected" : "Disconnected"}
          </p>
          <p className="text-sm">{displayMessage()}</p>
        </div>
      </div>
    </div>
  )
}
