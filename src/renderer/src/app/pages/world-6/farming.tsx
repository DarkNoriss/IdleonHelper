import { useState } from "react"
import { useScriptStatusStore } from "@/store/script-status"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const Farming = () => {
  const [error, setError] = useState<string | null>(null)
  const currentScript = useScriptStatusStore((state) => state.currentScript)
  const setCurrentScript = useScriptStatusStore(
    (state) => state.setCurrentScript
  )

  const isFarmingRunning = currentScript === "farming"
  const isLockUnlockRunning = currentScript === "farming.lock-unlock"
  const isWorking = currentScript !== null

  const handleStart = async () => {
    if (isFarmingRunning) {
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

    if (isWorking) {
      setError("Another operation is already running")
      return
    }

    setError(null)
    setCurrentScript("farming")

    try {
      await window.api.script.world6.farming.start()
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        setCurrentScript(null)
      } else {
        setError(err instanceof Error ? err.message : "Failed to start farming")
        setCurrentScript(null)
      }
    }
  }

  const handleLockUnlock = async () => {
    if (isLockUnlockRunning) {
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

    if (isWorking) {
      setError("Another operation is already running")
      return
    }

    setError(null)
    setCurrentScript("farming.lock-unlock")

    try {
      await window.api.script.world6.farming.lockUnlock()
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        setCurrentScript(null)
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to lock/unlock crops"
        )
        setCurrentScript(null)
      }
    }
  }

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="text-center">Farming</CardTitle>
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
              Farming Script
            </div>
            <Button
              onClick={handleStart}
              size="sm"
              className="w-full"
              disabled={isWorking && !isFarmingRunning}
            >
              {isFarmingRunning
                ? "Running... (Click to stop)"
                : "Start Farming"}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="text-center text-sm font-semibold uppercase">
              Lock/Unlock Crops
            </div>
            <Button
              onClick={handleLockUnlock}
              size="sm"
              className="w-full"
              disabled={isWorking && !isLockUnlockRunning}
            >
              {isLockUnlockRunning
                ? "Running... (Click to stop)"
                : "Lock/Unlock Crops"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
