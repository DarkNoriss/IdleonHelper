import * as React from "react"
import { useWebSocketStore, type WSMessage } from "@/stores/ws"

import { Button } from "@/components/ui/button"

const SOURCE = "world-3"

export const World3Temp = (): React.ReactElement => {
  const { isConnected, send, subscribe } = useWebSocketStore()
  const [logs, setLogs] = React.useState<string[]>([])
  const [isRunning, setIsRunning] = React.useState(false)

  React.useEffect(() => {
    const unsubscribe = subscribe(SOURCE, (msg: WSMessage) => {
      if (msg.type === "log") {
        setLogs((prev) => [...prev, String(msg.data || "")])
      } else if (msg.type === "done") {
        setLogs((prev) => [...prev, String(msg.data || "Task completed")])
        setIsRunning(false)
      } else if (msg.type === "error") {
        setLogs((prev) => [
          ...prev,
          `Error: ${String(msg.data || "Unknown error")}`,
        ])
        setIsRunning(false)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [subscribe])

  const handleStartConstruction = (): void => {
    setLogs([])
    setIsRunning(true)
    send({ type: "world-3-construction", source: SOURCE })
  }

  return (
    <div className="flex h-full flex-col gap-4 p-8">
      <h1 className="text-3xl font-bold">World 3 - Temp</h1>
      <div className="flex flex-col gap-4">
        <Button
          onClick={handleStartConstruction}
          disabled={!isConnected || isRunning}
        >
          {isRunning ? "Running..." : "Start Construction"}
        </Button>
        {logs.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Logs:</h2>
            <div className="bg-muted max-h-[400px] overflow-auto rounded-md p-4">
              <div className="flex flex-col gap-1">
                {logs.map((log, index) => (
                  <p key={index} className="text-sm">
                    {log}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
