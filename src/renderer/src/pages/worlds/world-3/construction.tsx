import * as React from "react"
import { useJsonDataStore } from "@/stores/json-data"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export const World3Construction = (): React.ReactElement => {
  const jsonData = useJsonDataStore((state) => state.jsonData)
  const setJsonData = useJsonDataStore((state) => state.setJsonData)
  const [textareaValue, setTextareaValue] = React.useState(jsonData || "")
  const [cogMResult, setCogMResult] = React.useState<unknown>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = (): void => {
    setJsonData(textareaValue)
    setTextareaValue("")
  }

  const handleProcessJson = async (): Promise<void> => {
    if (!jsonData) {
      setError("No JSON data available. Please set JSON data first.")
      return
    }

    setIsProcessing(true)
    setError(null)
    setCogMResult(null)

    try {
      const result = await window.api.world3.processJson(jsonData)

      if (result.success) {
        setCogMResult(result.data)
      } else {
        setError(result.error || "Failed to process JSON")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setIsProcessing(false)
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
          <Button onClick={handleSubmit}>Set JSON Data</Button>
          <Button
            onClick={handleProcessJson}
            disabled={isProcessing || !jsonData}
          >
            {isProcessing ? "Processing..." : "Process JSON (Get CogM)"}
          </Button>
        </div>
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-4">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}
        {cogMResult !== null && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">CogM Result:</h2>
            <pre className="bg-muted max-h-[300px] overflow-auto rounded-md p-4 text-sm">
              {JSON.stringify(cogMResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
