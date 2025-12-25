import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const Summoning = () => {
  const [error, setError] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [runningMode, setRunningMode] = useState<
    "endless" | "autobattler" | null
  >(null)

  const handleEndlessAutobattler = async () => {
    // If already working and this is the running mode, cancel it
    if (isWorking && runningMode === "endless") {
      try {
        await window.api.script.cancel()
        setRunningMode(null)
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
    setRunningMode("endless")

    try {
      await window.api.script.world6.summoning.startEndlessAutobattler()
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        // User cancelled, don't show error
        setRunningMode(null)
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to start endless autobattler"
        )
        setRunningMode(null)
      }
    }
  }

  const handleAutobattler = async () => {
    // If already working and this is the running mode, cancel it
    if (isWorking && runningMode === "autobattler") {
      try {
        await window.api.script.cancel()
        setRunningMode(null)
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
    setRunningMode("autobattler")

    try {
      await window.api.script.world6.summoning.startAutobattler()
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        // User cancelled, don't show error
        setRunningMode(null)
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to start autobattler"
        )
        setRunningMode(null)
      }
    }
  }

  useEffect(() => {
    // Get initial status
    window.api.script.getStatus().then((status) => {
      setIsWorking(status.isWorking)
      if (!status.isWorking) {
        setRunningMode(null)
      }
    })

    // Listen for status changes
    const cleanup = window.api.script.onStatusChange((status) => {
      setIsWorking(status.isWorking)
      if (!status.isWorking) {
        setRunningMode(null)
      }
    })

    return cleanup
  }, [])

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="text-center">Summoning</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/10 text-destructive mb-4 rounded-md p-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-center text-sm font-semibold uppercase">
              Endless Autobattler
            </div>
            <Button
              onClick={handleEndlessAutobattler}
              size="sm"
              className="w-full"
              disabled={isWorking && runningMode !== "endless"}
            >
              {runningMode === "endless"
                ? "Running... (Click to stop)"
                : "Start Endless Autobattler"}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="text-center text-sm font-semibold uppercase">
              Autobattler
            </div>
            <Button
              onClick={handleAutobattler}
              size="sm"
              className="w-full"
              disabled={isWorking && runningMode !== "autobattler"}
            >
              {runningMode === "autobattler"
                ? "Running... (Click to stop)"
                : "Start Autobattler"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
