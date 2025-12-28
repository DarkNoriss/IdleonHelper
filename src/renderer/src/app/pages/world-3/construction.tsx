import { useState } from "react"
import { useScriptStatusStore } from "@/store/script-status"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const Construction = () => {
  const [error, setError] = useState<string | null>(null)
  const currentScript = useScriptStatusStore((state) => state.currentScript)
  const setCurrentScript = useScriptStatusStore(
    (state) => state.setCurrentScript
  )

  const isConstructionRunning = currentScript === "world3.construction"
  const isWorking = currentScript !== null

  const handleConstruction = async () => {
    // If already working and this is the running mode, cancel it
    if (isConstructionRunning) {
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
    setCurrentScript("world3.construction")

    try {
      await window.api.script.world3.construction.run()
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        // User cancelled, don't show error
        setCurrentScript(null)
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to run construction script"
        )
        setCurrentScript(null)
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Construction</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/10 text-destructive mb-4 rounded-md p-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <div className="text-muted-foreground text-center text-sm">
            Navigate to the construction screen
          </div>
          <Button
            onClick={handleConstruction}
            size="lg"
            className="min-w-48"
            disabled={isWorking && !isConstructionRunning}
          >
            {isConstructionRunning
              ? "Running... (Click to stop)"
              : "Start Construction"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
