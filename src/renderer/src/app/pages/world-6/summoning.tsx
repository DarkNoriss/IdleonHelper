import { useState } from "react"
import { useScriptStatusStore } from "@/store/script-status"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const Summoning = () => {
  const [error, setError] = useState<string | null>(null)
  const currentScript = useScriptStatusStore((state) => state.currentScript)
  const setCurrentScript = useScriptStatusStore(
    (state) => state.setCurrentScript
  )

  const isEndlessRunning = currentScript === "summoning.endless"
  const isAutobattlerRunning = currentScript === "summoning.autobattler"
  const isWorking = currentScript !== null

  const handleEndlessAutobattler = async () => {
    // If already working and this is the running mode, cancel it
    if (isEndlessRunning) {
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
    setCurrentScript("summoning.endless")

    try {
      await window.api.script.world6.summoning.startEndlessAutobattler()
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        // User cancelled, don't show error
        setCurrentScript(null)
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to start endless autobattler"
        )
        setCurrentScript(null)
      }
    }
  }

  const handleAutobattler = async () => {
    // If already working and this is the running mode, cancel it
    if (isAutobattlerRunning) {
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
    setCurrentScript("summoning.autobattler")

    try {
      await window.api.script.world6.summoning.startAutobattler()
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        // User cancelled, don't show error
        setCurrentScript(null)
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to start autobattler"
        )
        setCurrentScript(null)
      }
    }
  }

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
              disabled={isWorking && !isEndlessRunning}
            >
              {isEndlessRunning
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
              disabled={isWorking && !isAutobattlerRunning}
            >
              {isAutobattlerRunning
                ? "Running... (Click to stop)"
                : "Start Autobattler"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
