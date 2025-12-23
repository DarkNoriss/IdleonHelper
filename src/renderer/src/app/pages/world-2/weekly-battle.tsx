import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type WeeklyBattleStep = {
  stepName: string
  steps: number[]
  rawSteps: string[]
}

type WeeklyBattleInfo = {
  dateFrom: string
  dateTo: string
  bossName: string
  steps: WeeklyBattleStep[]
}

type WeeklyBattleData = {
  fetchedAt: string
  info: WeeklyBattleInfo
}

export const WeeklyBattle = () => {
  const [data, setData] = useState<WeeklyBattleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const result = await window.api.script.world2.weeklyBattle.get()
      setData(result)
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load weekly battle data"
      )
    }
  }

  const handleFetch = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.script.world2.weeklyBattle.fetch()
      setData(result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch weekly battle data"
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRun = async (steps: number[]) => {
    try {
      await window.api.script.world2.weeklyBattle.run(steps)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to run weekly battle steps"
      )
    }
  }

  useEffect(() => {
    loadData()

    const cleanup = window.api.script.world2.weeklyBattle.onChange(
      (newData) => {
        setData(newData)
      }
    )

    return cleanup
  }, [])

  return (
    <Card className="relative">
      <CardHeader>
        <div className="relative">
          <CardTitle className="text-center">
            {data ? (
              <>
                <div className="text-lg font-semibold">
                  {data.info.bossName}
                </div>
                <div className="mt-1 text-base font-medium">
                  {new Date(data.info.dateFrom).toLocaleDateString()} -{" "}
                  {new Date(data.info.dateTo).toLocaleDateString()}
                </div>
              </>
            ) : (
              "Weekly Battle"
            )}
          </CardTitle>
          <Button
            onClick={handleFetch}
            disabled={loading}
            size="sm"
            className="absolute top-0 right-0"
          >
            {loading ? "Fetching..." : "Refetch Data"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/10 text-destructive mb-4 rounded-md p-3 text-sm">
            {error}
          </div>
        )}

        {!data && !error && (
          <div className="text-muted-foreground">No data available</div>
        )}

        {data && (
          <div className="space-y-6">
            {data.info.steps && data.info.steps.length > 0 && (
              <div className="grid grid-cols-2 gap-6">
                {data.info.steps.map((step, index) => (
                  <div key={index} className="space-y-3">
                    <div className="text-center text-sm font-semibold uppercase">
                      {step.stepName}
                    </div>
                    <Button
                      onClick={() => handleRun(step.steps)}
                      size="sm"
                      className="w-full"
                    >
                      {step.stepName.toLowerCase().includes("skull")
                        ? "Start skulls"
                        : "Start trophy"}
                    </Button>
                    <div className="space-y-2">
                      {step.rawSteps && step.rawSteps.length > 0 ? (
                        step.rawSteps.map((rawStep, stepIndex) => (
                          <div
                            key={stepIndex}
                            className="text-muted-foreground bg-background/50 rounded p-2 text-center text-xs"
                          >
                            {rawStep}
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground text-center text-xs">
                          No steps available
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
