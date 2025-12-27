import { useState } from "react"
import { useScriptStatusStore } from "@/store/script-status"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const Test = () => {
  const [error, setError] = useState<string | null>(null)
  const currentScript = useScriptStatusStore((state) => state.currentScript)
  const setCurrentScript = useScriptStatusStore(
    (state) => state.setCurrentScript
  )

  const isTestRunning = currentScript === "general.test"
  const isWorking = currentScript !== null

  const handleTest = async () => {
    // If already working and this is the running mode, cancel it
    if (isTestRunning) {
      try {
        await window.api.script.cancel()
        setCurrentScript(null)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to cancel operation"
        )
      }
      return
    }

    // If already working with a different mode, show error
    if (isWorking) {
      setError("Another operation is already running")
      return
    }

    setError(null)
    setCurrentScript("general.test")

    try {
      await window.api.script.general.test.run()
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        // User cancelled, don't show error
        setCurrentScript(null)
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to run test script"
        )
        setCurrentScript(null)
      }
    }
  }

  return (
    <Card className="relative m-4">
      <CardHeader>
        <CardTitle className="text-center">Test</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/10 text-destructive mb-4 rounded-md p-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <div className="text-muted-foreground text-center text-sm">
            Test script that waits for 30 seconds
          </div>
          <Button
            onClick={handleTest}
            size="lg"
            className="min-w-48"
            disabled={isWorking && !isTestRunning}
          >
            {isTestRunning ? "Running... (Click to stop)" : "Start Test"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
