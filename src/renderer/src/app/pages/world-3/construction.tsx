import { useEffect, useState } from "react"
import type {
  OptimalStep,
  SolverFocus,
  SolverResult,
  SolverWeights,
} from "@/../../types/construction"
import { useGameDataStore } from "@/store/game-data"
import { useRawJsonStore } from "@/store/raw-json"
import { useScriptStatusStore } from "@/store/script-status"
import { RefreshCw } from "lucide-react"

import { notateNumber } from "@/lib/notateNumber"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const SPARE_ROWS = 5
const TIME_OPTIONS = [5, 30, 60, 120, 240, 480]

const getSparePage = (y: number): number => {
  return Math.floor(y / SPARE_ROWS) + 1
}

const formatLocation = (
  location: OptimalStep["from"] | OptimalStep["to"]
): string => {
  const x = location.x + 1
  const y = location.y + 1
  const locationType = location.location

  if (location.location === "spare") {
    const page = getSparePage(location.y) // location.y is 0-indexed
    return `spare [${x}|${y}] page ${page}`
  }
  return `${locationType} [${x}|${y}]`
}

export const Construction = () => {
  const [error, setError] = useState<string | null>(null)
  const parsedJson = useRawJsonStore((state) => state.parsedJson)
  const constructionData = useGameDataStore((state) => state.construction)
  const [focus, setFocus] = useState<SolverFocus>("exp")
  const [solveTime, setSolveTime] = useState<string>("30")
  const [isSolving, setIsSolving] = useState(false)
  const [remainingTime, setRemainingTime] = useState<number>(0)
  const [solverResult, setSolverResult] = useState<SolverResult | null>(null)
  const currentScript = useScriptStatusStore((state) => state.currentScript)
  const setCurrentScript = useScriptStatusStore(
    (state) => state.setCurrentScript
  )

  const isApplying = currentScript === "world3.construction.apply"
  const isCollectingCogs = currentScript === "world3.construction.collect-cogs"
  const isTrashingCogs = currentScript === "world3.construction.trash-cogs"
  const isWorking = currentScript !== null
  const score = constructionData?.score

  // Detect if all slots are unlocked
  const allSlotsUnlocked =
    constructionData !== null
      ? constructionData.availableSlotKeys.length ===
        Object.keys(constructionData.slots).length -
          constructionData.flagPose.length
      : false

  // Switch focus away from flaggy if flaggy is no longer needed
  useEffect(() => {
    if (allSlotsUnlocked && focus === "flaggy") {
      setFocus("exp") // Switch to exp focus if flaggy was selected
    }
  }, [allSlotsUnlocked, focus])

  // Timer countdown effect
  useEffect(() => {
    if (!isSolving || remainingTime <= 0) {
      return
    }

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isSolving, remainingTime])

  // Calculate differences between current and optimized scores
  const getDifference = (current: number, optimized: number) => {
    return optimized - current
  }

  const buildRateDiff =
    score && solverResult
      ? getDifference(score.buildRate, solverResult.score.buildRate)
      : null
  const expBonusDiff =
    score && solverResult
      ? getDifference(score.expBonus, solverResult.score.expBonus)
      : null
  const flaggyDiff =
    score && solverResult
      ? getDifference(score.flaggy, solverResult.score.flaggy)
      : null

  const handleSolve = async () => {
    if (!constructionData) {
      setError("No construction data available")
      return
    }

    setError(null)
    setSolverResult(null)
    const solveTimeSeconds = Number.parseInt(solveTime, 10) || 5
    setRemainingTime(solveTimeSeconds)
    setIsSolving(true)

    try {
      const weights: SolverWeights = {
        focus: focus,
        flaggy: 0, // Will be set to 0 by solver if needed
      }

      const solveTimeMs = solveTimeSeconds * 1000

      const result = await window.api.script.world3.construction.solver(
        constructionData,
        weights,
        solveTimeMs
      )

      if (result) {
        setSolverResult(result)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to solve construction"
      )
    } finally {
      setIsSolving(false)
      setRemainingTime(0)
    }
  }

  const handleApply = async () => {
    if (isApplying) {
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
    setCurrentScript("world3.construction.apply")

    try {
      const steps = solverResult?.steps || []
      await window.api.script.world3.construction.apply(steps)
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        setCurrentScript(null)
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to apply optimized board"
        )
        setCurrentScript(null)
      }
    }
  }

  const handleCollectCogs = async () => {
    if (isCollectingCogs) {
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
    setCurrentScript("world3.construction.collect-cogs")

    try {
      await window.api.script.world3.construction.collectCogs()
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        setCurrentScript(null)
      } else {
        setError(err instanceof Error ? err.message : "Failed to collect cogs")
        setCurrentScript(null)
      }
    }
  }

  const handleTrashCogs = async () => {
    if (isTrashingCogs) {
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
    setCurrentScript("world3.construction.trash-cogs")

    try {
      await window.api.script.world3.construction.trashCogs()
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        setCurrentScript(null)
      } else {
        setError(err instanceof Error ? err.message : "Failed to trash cogs")
        setCurrentScript(null)
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-center text-2xl font-bold">Construction</h1>

      {error && (
        <div className="bg-destructive/10 text-destructive mb-4 w-full rounded-md p-3 text-sm">
          {error}
        </div>
      )}

      <div className="text-muted-foreground text-center text-sm">
        Navigate to the construction screen. Make sure to save your data on the
        Raw Data page first.
      </div>

      {!parsedJson && (
        <div className="w-full rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
          No data available. Please go to the Raw Data page and save your JSON
          data first.
        </div>
      )}

      {score && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">
              {solverResult ? "Optimized Score" : "Current Score"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {notateNumber(
                    solverResult
                      ? solverResult.score.buildRate
                      : score.buildRate
                  )}
                </div>
                {buildRateDiff && (
                  <div
                    className={`mt-1 text-sm font-medium ${
                      buildRateDiff >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {notateNumber(buildRateDiff)}
                  </div>
                )}
                <div className="text-muted-foreground mt-1 text-sm">
                  Build Rate
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {notateNumber(
                    solverResult ? solverResult.score.expBonus : score.expBonus
                  )}
                </div>
                {expBonusDiff && (
                  <div
                    className={`mt-1 text-sm font-medium ${
                      expBonusDiff >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {notateNumber(expBonusDiff)}
                  </div>
                )}
                <div className="text-muted-foreground mt-1 text-sm">
                  Exp Bonus
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {notateNumber(
                    solverResult ? solverResult.score.flaggy : score.flaggy
                  )}
                </div>
                {flaggyDiff && (
                  <div
                    className={`mt-1 text-sm font-medium ${
                      flaggyDiff >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {notateNumber(flaggyDiff)}
                  </div>
                )}
                <div className="text-muted-foreground mt-1 text-sm">Flaggy</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid w-full grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Focus</label>
          <Select
            value={focus}
            onValueChange={(value) => setFocus(value as SolverFocus)}
            disabled={isWorking}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select focus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exp">
                Focus: Exp (Exp first, Build Rate second)
              </SelectItem>
              <SelectItem value="buildRate">
                Focus: Build Rate (Build Rate first, Exp second)
              </SelectItem>
              <SelectItem value="flaggy" disabled={allSlotsUnlocked}>
                Focus: Flaggy (Flaggy first, Exp second)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Solve Time (sec)</label>
          <Select
            value={solveTime}
            onValueChange={setSolveTime}
            disabled={isWorking}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent className="max-h-[258px]">
              {TIME_OPTIONS.map((seconds) => {
                return (
                  <SelectItem key={seconds} value={seconds.toString()}>
                    {seconds}s
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button
          onClick={handleSolve}
          size="lg"
          className="min-w-48"
          disabled={!constructionData || isSolving || isWorking}
        >
          {isSolving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              {remainingTime > 0
                ? `Solving... (${remainingTime}s)`
                : "Solving..."}
            </>
          ) : (
            "Solve Construction"
          )}
        </Button>

        <Button
          onClick={handleApply}
          size="lg"
          className="min-w-48"
          disabled={
            (isWorking && !isApplying) ||
            !solverResult ||
            !solverResult.steps ||
            solverResult.steps.length === 0
          }
          variant="default"
        >
          {isApplying ? "Applying... (Click to stop)" : "Apply Optimized Board"}
        </Button>
      </div>

      <div className="flex w-full gap-3">
        <Button
          onClick={handleCollectCogs}
          size="lg"
          className="flex-1"
          disabled={isWorking && !isCollectingCogs}
          variant="default"
        >
          {isCollectingCogs ? "Collecting... (Click to stop)" : "Collect cogs"}
        </Button>

        <Button
          onClick={handleTrashCogs}
          size="lg"
          className="flex-1"
          disabled={isWorking && !isTrashingCogs}
          variant="default"
        >
          {isTrashingCogs ? "Trashing... (Click to stop)" : "Trash cogs"}
        </Button>
      </div>

      {solverResult && solverResult.steps.length > 0 && (
        <div className="mt-4 w-full">
          <div className="mb-2 text-center text-sm font-medium">
            Steps ({solverResult.steps.length})
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
            {solverResult.steps.map((step, index) => (
              <div key={index} className="text-sm">
                Step {index + 1}: Switch {formatLocation(step.from)} with{" "}
                {formatLocation(step.to)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
