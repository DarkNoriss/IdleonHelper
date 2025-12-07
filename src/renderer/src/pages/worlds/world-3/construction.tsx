import * as React from "react"
import { useJsonDataStore } from "@/stores/json-data"
import { useWebSocketStore, type WSMessage } from "@/stores/ws"
import { Check, Loader2, Play, Save, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { ScoreCard } from "./score-card"

const SOURCE = "world-3-construction"

interface ScoreCardData {
  buildRate: string
  expBonus: string
  flaggy: string
  afterBuildRate?: string
  afterExpBonus?: string
  afterFlaggy?: string
  buildRateDiff?: string
  expBonusDiff?: string
  flaggyDiff?: string
}

interface TimePreset {
  label: string
  value: number
}

const TIME_PRESETS: Record<string, TimePreset> = {
  quick: { label: "Quick (10 sec)", value: 10 },
  medium: { label: "Medium (30 sec)", value: 30 },
  long: { label: "Long (60 sec)", value: 60 },
  veryLong: { label: "Very Long (120 sec)", value: 120 },
}

export const Construction = (): React.ReactElement => {
  const { jsonData, setJsonData } = useJsonDataStore()
  const { isConnected, send, subscribe } = useWebSocketStore()
  const [textareaValue, setTextareaValue] = React.useState("")
  const [scoreCardData, setScoreCardData] =
    React.useState<ScoreCardData | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [timePreset, setTimePreset] = React.useState<string>("medium")
  const [isOptimizing, setIsOptimizing] = React.useState(false)
  const [isApplyingBoard, setIsApplyingBoard] = React.useState(false)
  const [remainingTime, setRemainingTime] = React.useState<number | null>(null)
  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null)

  // Load JSON from store on mount
  React.useEffect(() => {
    if (jsonData) {
      setTextareaValue(jsonData)
    }
  }, [jsonData])

  // Subscribe to WebSocket messages
  React.useEffect(() => {
    const unsubscribe = subscribe(SOURCE, (msg: WSMessage) => {
      if (msg.type === "data") {
        try {
          const rawData = String(msg.data || "{}")
          const data = JSON.parse(rawData) as ScoreCardData
          setScoreCardData(data)
          setIsProcessing(false)
          setIsOptimizing(false)
          setError(null)
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to parse data")
          setIsProcessing(false)
          setIsOptimizing(false)
        }
      } else if (msg.type === "done") {
        const doneMessage = String(msg.data || "")

        // Check if this is the apply-board done message
        if (doneMessage.includes("apply-board")) {
          setIsApplyingBoard(false)
        } else {
          setIsProcessing(false)
          setIsOptimizing(false)
          setRemainingTime(null)
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }
        }
      } else if (msg.type === "error") {
        const errorMessage = String(msg.data || "Unknown error")
        setError(errorMessage)

        // Reset all processing states on error
        setIsProcessing(false)
        setIsOptimizing(false)
        setIsApplyingBoard(false)
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
  }, [subscribe])

  const handleSave = (): void => {
    const trimmedValue = textareaValue.trim()
    if (!trimmedValue) {
      setError("No JSON data provided.")
      return
    }

    try {
      JSON.parse(trimmedValue)
      setJsonData(trimmedValue)
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
    const trimmedValue = textareaValue.trim()
    if (!trimmedValue) {
      setError("No JSON data provided. Please enter JSON data first.")
      return
    }

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(trimmedValue)
    } catch (err) {
      setError(
        err instanceof Error
          ? `Invalid JSON format: ${err.message}`
          : "Invalid JSON format"
      )
      return
    }

    // Save to store if changed
    if (jsonData !== trimmedValue) {
      setJsonData(trimmedValue)
    }

    // Extract data payload (support nested data structure)
    const payload = (parsedJson as { data?: unknown }).data ?? parsedJson

    // Reset state before processing
    setScoreCardData(null)
    setError(null)
    setIsProcessing(true)

    // Send to backend
    send({
      type: "world-3-construction-load-json",
      source: SOURCE,
      data: payload,
    })
  }

  const handleOptimize = (): void => {
    if (!scoreCardData) {
      setError("Please load data first before optimizing.")
      return
    }

    const preset = TIME_PRESETS[timePreset]
    if (!preset) {
      setError("Invalid time preset selected.")
      return
    }

    setError(null)
    setIsOptimizing(true)

    // Clear any existing countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    // Set initial remaining time and start countdown
    setRemainingTime(preset.value)
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

    send({
      type: "world-3-construction-optimize",
      source: SOURCE,
      data: { timeInSeconds: preset.value },
    })
  }

  const handleApplyBoard = (): void => {
    if (!scoreCardData) {
      setError("Please load and optimize data first before applying board.")
      return
    }

    if (
      !scoreCardData.afterBuildRate ||
      !scoreCardData.afterExpBonus ||
      !scoreCardData.afterFlaggy
    ) {
      setError("No optimized board found. Please run optimization first.")
      return
    }

    setError(null)
    setIsApplyingBoard(true)

    send({
      type: "world-3-construction-apply-board",
      source: SOURCE,
    })
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, "0")}`
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <Textarea
        placeholder="Enter JSON data here..."
        value={textareaValue}
        onChange={(e) => setTextareaValue(e.target.value)}
        rows={4}
      />

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={!textareaValue.trim()}
        >
          <Save className="size-4" />
          Save
        </Button>
        <Button
          onClick={handleProcessJson}
          disabled={
            !isConnected ||
            isProcessing ||
            !textareaValue.trim() ||
            isOptimizing
          }
        >
          {isProcessing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {isProcessing ? "Processing..." : "Send to Process"}
        </Button>
      </div>

      {scoreCardData && (
        <ScoreCard
          buildRate={scoreCardData.buildRate}
          expBonus={scoreCardData.expBonus}
          flaggy={scoreCardData.flaggy}
          afterBuildRate={scoreCardData.afterBuildRate}
          afterExpBonus={scoreCardData.afterExpBonus}
          afterFlaggy={scoreCardData.afterFlaggy}
          buildRateDiff={scoreCardData.buildRateDiff}
          expBonusDiff={scoreCardData.expBonusDiff}
          flaggyDiff={scoreCardData.flaggyDiff}
        />
      )}

      {scoreCardData && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
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

              {isOptimizing && remainingTime !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Time remaining:</span>
                  <span className="text-lg font-bold tabular-nums">
                    {formatTime(remainingTime)}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleOptimize}
                disabled={!isConnected || isOptimizing}
              >
                {isOptimizing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                {isOptimizing ? "Optimizing..." : "Optimize"}
              </Button>
              <Button
                onClick={handleApplyBoard}
                disabled={
                  !isConnected ||
                  isApplyingBoard ||
                  !scoreCardData.afterBuildRate ||
                  !scoreCardData.afterExpBonus ||
                  !scoreCardData.afterFlaggy
                }
              >
                {isApplyingBoard ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {isApplyingBoard ? "Applying..." : "Apply Board"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
