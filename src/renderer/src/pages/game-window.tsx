import * as React from "react"
import { useWebSocketStore, type WSMessage } from "@/stores/ws"

import { Button } from "@/components/ui/button"

const SOURCE = "test"

export const GameWindow = (): React.ReactElement => {
  const { isConnected, error, send, subscribe } = useWebSocketStore()

  const [testMessage, setTestMessage] = React.useState<string | null>(null)
  const [logs, setLogs] = React.useState<string[]>([])

  React.useEffect(() => {
    const unsubscribe = subscribe(SOURCE, (msg: WSMessage) => {
      const messageData = String(msg.data || "")

      if (msg.type === "log") {
        setLogs((prev) => [...prev, `[LOG] ${messageData}`])
        setTestMessage(`Test received: ${msg.type} - ${messageData}`)
      } else if (msg.type === "error") {
        setLogs((prev) => [...prev, `[ERROR] ${messageData}`])
        setTestMessage(`Error: ${messageData}`)
      } else if (msg.type === "done") {
        setLogs((prev) => [...prev, `[DONE] ${messageData}`])
        setTestMessage(`Done: ${messageData}`)
      } else {
        setTestMessage(
          `Test received: ${msg.type} - ${JSON.stringify(msg.data || "")}`
        )
      }
    })

    return () => {
      unsubscribe()
    }
  }, [subscribe])

  const handleSendPing = (): void => {
    send({ type: "ping", source: SOURCE })
  }

  const handleTestCaptureScreenshot = (): void => {
    setLogs([])
    setTestMessage(null)
    send({ type: "test-capture-screenshot", source: SOURCE })
  }

  const handleOpenCodex = (): void => {
    setLogs([])
    setTestMessage(null)
    send({ type: "test-open-codex", source: SOURCE })
  }

  const handleOpenConstruction = (): void => {
    setLogs([])
    setTestMessage(null)
    send({ type: "test-open-construction", source: SOURCE })
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
          <Button onClick={handleOpenCodex} disabled={!isConnected}>
            Open Codex
          </Button>
          <Button onClick={handleOpenConstruction} disabled={!isConnected}>
            Open Construction
          </Button>
        </div>
        <div className="mt-4 min-h-[100px] min-w-[300px] rounded-lg border p-4">
          <p className="text-muted-foreground mb-2 text-sm">
            Status: {isConnected ? "Connected" : "Disconnected"}
          </p>
          {logs.length > 0 ? (
            <div className="flex flex-col gap-1">
              {logs.map((log, index) => (
                <p key={index} className="font-mono text-xs">
                  {log}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm">{displayMessage()}</p>
          )}
        </div>
      </div>
    </div>
  )
}
