import { useState } from "react"
import { useGameDataStore } from "@/store/game-data"
import { useRawJsonStore } from "@/store/raw-json"
import { useScriptStatusStore } from "@/store/script-status"

import { notateNumber } from "@/lib/notateNumber"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SolverResult, SolverWeights } from "@/../../types/construction"

export const Construction = () => {
  const [error, setError] = useState<string | null>(null)
  const parsedJson = useRawJsonStore((state) => state.parsedJson)
  const constructionData = useGameDataStore((state) => state.construction)
  const [buildRateWeight, setBuildRateWeight] = useState<string>("1")
  const [expWeight, setExpWeight] = useState<string>("100")
  const [flaggyWeight, setFlaggyWeight] = useState<string>("250")
  const [solveTime, setSolveTime] = useState<string>("5")
  const [isSolving, setIsSolving] = useState(false)
  const [solverResult, setSolverResult] = useState<SolverResult | null>(null)
  const currentScript = useScriptStatusStore((state) => state.currentScript)
  const setCurrentScript = useScriptStatusStore(
    (state) => state.setCurrentScript
  )

  const isApplying = currentScript === "world3.construction.apply"
  const isWorking = currentScript !== null
  const score = constructionData?.score

  // Calculate differences between current and optimized scores
  const getDifference = (
    current: number,
    optimized: number
  ): { value: number; formatted: string } => {
    const diff = optimized - current
    return {
      value: diff,
      formatted: diff >= 0 ? `+${notateNumber(diff)}` : notateNumber(diff),
    }
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
    setIsSolving(true)

    try {
      const weights: SolverWeights = {
        buildRate: Number.parseFloat(buildRateWeight) || 1,
        exp: Number.parseFloat(expWeight) || 100,
        flaggy: Number.parseFloat(flaggyWeight) || 250,
      }

      const solveTimeMs = Number.parseInt(solveTime, 10) * 1000

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
    }
  }

  const handleApply = async () => {
    if (isWorking) {
      setError("Another operation is already running")
      return
    }

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
            Navigate to the construction screen. Make sure to save your data on
            the Raw Data page first.
          </div>

          {!parsedJson && (
            <div className="w-full rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
              No data available. Please go to the Raw Data page and save your
              JSON data first.
            </div>
          )}

          {score && (
            <div className="w-full">
              <div className="mb-2 text-center text-sm font-medium">
                {solverResult ? "Optimized Score" : "Current Score"}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
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
                            buildRateDiff.value >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {buildRateDiff.formatted}
                        </div>
                      )}
                      <div className="text-muted-foreground mt-1 text-sm">
                        Build Rate
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {notateNumber(
                          solverResult
                            ? solverResult.score.expBonus
                            : score.expBonus
                        )}
                      </div>
                      {expBonusDiff && (
                        <div
                          className={`mt-1 text-sm font-medium ${
                            expBonusDiff.value >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {expBonusDiff.formatted}
                        </div>
                      )}
                      <div className="text-muted-foreground mt-1 text-sm">
                        Exp Bonus
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {notateNumber(
                          solverResult
                            ? solverResult.score.flaggy
                            : score.flaggy
                        )}
                      </div>
                      {flaggyDiff && (
                        <div
                          className={`mt-1 text-sm font-medium ${
                            flaggyDiff.value >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {flaggyDiff.formatted}
                        </div>
                      )}
                      <div className="text-muted-foreground mt-1 text-sm">
                        Flaggy
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {solverResult && solverResult.steps.length > 0 && (
                <div className="mt-4 w-full">
                  <div className="mb-2 text-center text-sm font-medium">
                    Steps ({solverResult.steps.length})
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
                    {solverResult.steps.map((step, index) => (
                      <div key={index} className="text-sm">
                        Step {index + 1}: Switch {step.fromPos.location} [
                        {step.fromPos.x + 1}|{step.fromPos.y + 1}] with{" "}
                        {step.toPos.location} [{step.toPos.x + 1}|
                        {step.toPos.y + 1}]
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid w-full grid-cols-4 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Build Rate Weight</label>
              <Input
                type="number"
                value={buildRateWeight}
                onChange={(e) => setBuildRateWeight(e.target.value)}
                disabled={isWorking}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Exp Weight</label>
              <Input
                type="number"
                value={expWeight}
                onChange={(e) => setExpWeight(e.target.value)}
                disabled={isWorking}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Flaggy Weight</label>
              <Input
                type="number"
                value={flaggyWeight}
                onChange={(e) => setFlaggyWeight(e.target.value)}
                disabled={isWorking}
              />
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
                <SelectContent className="max-h-[300px]">
                  {Array.from({ length: 24 }, (_, i) => {
                    const seconds = (i + 1) * 5
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
              {isSolving ? "Solving..." : "Solve Construction"}
            </Button>

            <Button
              onClick={handleApply}
              size="lg"
              className="min-w-48"
              disabled={isWorking && !isApplying}
              variant="default"
            >
              {isApplying
                ? "Applying... (Click to stop)"
                : "Apply Optimized Board"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
