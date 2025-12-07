import * as React from "react"
import { useJsonDataStore } from "@/stores/json-data"
import { useWebSocketStore, type WSMessage } from "@/stores/ws"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const SOURCE = "world-3-construction"

interface TimePreset {
  label: string
  value: number
}

interface ScoreData {
  BuildRate: string
  ExpBonus: string
  Flaggy: string
}

interface OptimizationResult {
  Before: ScoreData
  After: ScoreData
  BuildRateDiff: string
  ExpBonusDiff: string
  FlaggyDiff: string
}

const TIME_PRESETS: Record<string, TimePreset> = {
  quick: { label: "Quick (10 sec)", value: 10 },
  medium: { label: "Medium (30 sec)", value: 30 },
  long: { label: "Long (60 sec)", value: 60 },
  custom: { label: "Custom", value: 0 }, // 0 indicates custom input
}

export const World3Construction = (): React.ReactElement => {
  const { isConnected, send, subscribe } = useWebSocketStore()
  const { jsonData, setJsonData } = useJsonDataStore()
  const [textareaValue, setTextareaValue] = React.useState("")
  const [score, setScore] = React.useState<ScoreData | null>(null)
  const [optimizationResult, setOptimizationResult] =
    React.useState<OptimizationResult | null>(null)
  const [logs, setLogs] = React.useState<string[]>([])
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [dataLoaded, setDataLoaded] = React.useState(false)
  const [timePreset, setTimePreset] = React.useState<string>("medium")
  const [customTime, setCustomTime] = React.useState<string>("120")
  const [isOptimizing, setIsOptimizing] = React.useState(false)
  const [remainingTime, setRemainingTime] = React.useState<number | null>(null)
  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null)
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
        const logMessage = String(msg.data || "")
        setLogs((prev) => [...prev, logMessage])

        // Check if it's the "Starting optimization" message to extract time
        const startingMatch = logMessage.match(
          /Starting optimization for (\d+) seconds/
        )
        if (startingMatch && isOptimizing) {
          const totalSeconds = parseInt(startingMatch[1], 10)
          if (!isNaN(totalSeconds)) {
            setRemainingTime(totalSeconds)

            // Start countdown
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current)
            }

            countdownIntervalRef.current = setInterval(() => {
              setRemainingTime((prev) => {
                if (prev === null || prev <= 1) {
                  if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current)
                    countdownIntervalRef.current = null
                  }
                  return 0
                }
                return prev - 1
              })
            }, 1000)
          }
        }
      } else if (msg.type === "data") {
        try {
          const data = JSON.parse(String(msg.data || "{}")) as
            | ScoreData
            | OptimizationResult

          // Check if it's an optimization result (has Before/After) or just a score
          if (
            data &&
            typeof data === "object" &&
            "Before" in data &&
            "After" in data
          ) {
            // It's an optimization result
            setOptimizationResult(data as OptimizationResult)
          } else {
            // It's a score from initial load
            setScore(data as ScoreData)
            setDataLoaded(true)
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to parse data")
        }
      } else if (msg.type === "done") {
        setLogs((prev) => [...prev, String(msg.data || "Task completed")])
        setIsProcessing(false)
        setIsOptimizing(false)
        setRemainingTime(null)
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
      } else if (msg.type === "error") {
        setError(String(msg.data || "Unknown error"))
        setLogs((prev) => [
          ...prev,
          `Error: ${String(msg.data || "Unknown error")}`,
        ])
        setIsProcessing(false)
        setDataLoaded(false)
        setIsOptimizing(false)
        setRemainingTime(null)
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
      }
    })

    return () => {
      unsubscribe()
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [subscribe, isOptimizing])

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
      setOptimizationResult(null)
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

  const handleOptimize = (): void => {
    if (!dataLoaded) {
      setError("Please load data first before optimizing.")
      return
    }

    // Calculate time in seconds based on preset
    let timeInSeconds: number
    const preset = TIME_PRESETS[timePreset]

    if (timePreset === "custom") {
      const custom = parseInt(customTime, 10)
      if (isNaN(custom) || custom <= 0) {
        setError("Please enter a valid number of seconds (greater than 0).")
        return
      }
      timeInSeconds = custom
    } else {
      timeInSeconds = preset.value
    }

    setError(null)
    setLogs([])
    setOptimizationResult(null)
    setIsOptimizing(true)

    send({
      type: "world-3-construction-optimize",
      source: SOURCE,
      data: { timeInSeconds },
    })
  }

  return (
    <div className="flex h-full flex-col gap-4 p-8">
      <h1 className="text-3xl font-bold">World 3 - Construction</h1>
      <div className="flex flex-col gap-4">
        <Textarea
          placeholder="Enter JSON data here..."
          value={textareaValue}
          onChange={(e) => setTextareaValue(e.target.value)}
          rows={10}
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
        {score !== null && !optimizationResult && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">Current Score:</h2>
            <div className="bg-muted rounded-md p-4">
              <div className="flex flex-col gap-2 text-sm">
                <div>Build Rate: {score.BuildRate}</div>
                <div>Exp Bonus: {score.ExpBonus}</div>
                <div>Flaggy: {score.Flaggy}</div>
              </div>
            </div>
          </div>
        )}
        {(() => {
          if (!optimizationResult) {
            return null
          }

          const result = optimizationResult

          return (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">Optimization Result:</h2>
              <div className="bg-muted rounded-md p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">Before:</h3>
                    <div className="flex flex-col gap-1 text-sm">
                      <div>Build Rate: {result.Before.BuildRate}</div>
                      <div>Exp Bonus: {result.Before.ExpBonus}</div>
                      <div>Flaggy: {result.Before.Flaggy}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">After:</h3>
                    <div className="flex flex-col gap-1 text-sm">
                      <div>Build Rate: {result.After.BuildRate}</div>
                      <div>Exp Bonus: {result.After.ExpBonus}</div>
                      <div>Flaggy: {result.After.Flaggy}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 border-t pt-4">
                  <h3 className="mb-2 text-lg font-semibold">Improvements:</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Build Rate: {result.BuildRateDiff}</div>
                    <div>Exp Bonus: {result.ExpBonusDiff}</div>
                    <div>Flaggy: {result.FlaggyDiff}</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
        {dataLoaded && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">Optimize Board:</h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="min-w-[100px] text-sm font-medium">
                  Time Preset:
                </label>
                <Select value={timePreset} onValueChange={setTimePreset}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIME_PRESETS).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {timePreset === "custom" && (
                <div className="flex items-center gap-3">
                  <label className="min-w-[100px] text-sm font-medium">
                    Custom Time (seconds):
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-[200px]"
                    placeholder="Enter seconds"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    onClick={handleOptimize}
                    disabled={!isConnected || isOptimizing}
                  >
                    {isOptimizing ? "Optimizing..." : "Start Optimization"}
                  </Button>
                </div>
                {isOptimizing && remainingTime !== null && (
                  <div className="bg-primary/10 flex items-center gap-2 rounded-md p-3">
                    <div className="text-sm font-medium">Time remaining:</div>
                    <div className="text-lg font-bold tabular-nums">
                      {Math.floor(remainingTime / 60)}:
                      {String(remainingTime % 60).padStart(2, "0")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
