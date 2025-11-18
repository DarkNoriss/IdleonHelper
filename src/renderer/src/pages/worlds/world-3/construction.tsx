import * as React from "react"
import { useJsonDataStore } from "@/stores/json-data"
import { useWebSocketStore, type WSMessage } from "@/stores/ws"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const SOURCE = "world-3-construction"

export const World3Construction = (): React.ReactElement => {
  const { isConnected, send, subscribe } = useWebSocketStore()
  const { jsonData, setJsonData } = useJsonDataStore()
  const [textareaValue, setTextareaValue] = React.useState("")
  const [score, setScore] = React.useState<unknown>(null)
  const [logs, setLogs] = React.useState<string[]>([])
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [dataLoaded, setDataLoaded] = React.useState(false)
  const hasLoadedFromStore = React.useRef(false)

  // Load JSON from store on initial mount
  React.useEffect(() => {
    if (!hasLoadedFromStore.current && jsonData) {
      setTextareaValue(jsonData)
      hasLoadedFromStore.current = true
    }
  }, [jsonData])

  React.useEffect(() => {
    const unsubscribe = subscribe(SOURCE, (msg: WSMessage) => {
      if (msg.type === "log") {
        setLogs((prev) => [...prev, String(msg.data || "")])
      } else if (msg.type === "data") {
        try {
          const scoreData = JSON.parse(String(msg.data || "{}"))
          setScore(scoreData)
          setDataLoaded(true)
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to parse score data"
          )
        }
      } else if (msg.type === "done") {
        setLogs((prev) => [...prev, String(msg.data || "Task completed")])
        setIsProcessing(false)
      } else if (msg.type === "error") {
        setError(String(msg.data || "Unknown error"))
        setLogs((prev) => [
          ...prev,
          `Error: ${String(msg.data || "Unknown error")}`,
        ])
        setIsProcessing(false)
        setDataLoaded(false)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [subscribe])

  const handleSaveJson = (): void => {
    if (!textareaValue.trim()) {
      setError("No JSON data provided. Please enter JSON data first.")
      return
    }

    try {
      // Validate JSON format
      JSON.parse(textareaValue)

      // Save to store for persistence
      setJsonData(textareaValue)
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? `Invalid JSON format: ${err.message}`
          : "Invalid JSON format"
      )
    }
  }

  const handleProcessJson = (): void => {
    if (!textareaValue.trim()) {
      setError("No JSON data provided. Please enter JSON data first.")
      return
    }

    try {
      // Parse the full JSON to validate it
      const fullJson = JSON.parse(textareaValue)

      // Save to store for persistence (if not already saved)
      if (!jsonData || jsonData !== textareaValue) {
        setJsonData(textareaValue)
      }

      // Send the whole JSON data object - backend can extract what it needs
      // This avoids needing to update frontend when new fields are needed
      const jsonDataToSend = fullJson.data ?? fullJson

      setScore(null)
      setLogs([])
      setError(null)
      setDataLoaded(false)
      setIsProcessing(true)

      send({
        type: "world-3-construction-load-json",
        source: SOURCE,
        data: jsonDataToSend,
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? `Invalid JSON format: ${err.message}`
          : "Invalid JSON format"
      )
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-8">
      <h1 className="text-3xl font-bold">World 3 - Construction</h1>
      <div className="flex flex-col gap-4">
        <Textarea
          placeholder="Enter JSON data here..."
          value={textareaValue}
          onChange={(e) => setTextareaValue(e.target.value)}
          className="min-h-[200px]"
        />
        <div className="flex gap-2">
          <Button
            onClick={handleSaveJson}
            disabled={!textareaValue.trim()}
            variant="outline"
          >
            Save to Store
          </Button>
          <Button
            onClick={handleProcessJson}
            disabled={!isConnected || isProcessing || !textareaValue.trim()}
          >
            {isProcessing ? "Processing..." : "Send to Backend"}
          </Button>
        </div>
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-4">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}
        {logs.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Logs:</h2>
            <div className="bg-muted max-h-[200px] overflow-auto rounded-md p-4">
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
        {score !== null && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Current Score:</h2>
            <pre className="bg-muted max-h-[300px] overflow-auto rounded-md p-4 text-sm">
              {JSON.stringify(score, null, 2)}
            </pre>
          </div>
        )}
        {dataLoaded && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Actions:</h2>
            <div className="flex gap-2">
              <Button disabled variant="outline">
                Optimize Board (Coming Soon)
              </Button>
              <Button disabled variant="outline">
                Calculate Best Moves (Coming Soon)
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              Data is loaded and ready for optimization actions.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
