import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useMainState } from "@/hooks/use-main-state.ts";

const WeeklyBattle = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queue = useMainState("queue");
  const weeklyBattle = useMainState("weeklyBattle");
  const running = queue?.runningItem ?? null;
  const data = weeklyBattle?.data ?? null;

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      await window.api.script.world2.weeklyBattle.fetch();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch weekly battle data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async (steps: number[], _stepName: string) => {
    const scriptId = "world2.weeklyBattle.run" as const;
    const isMyRunning = running?.scriptId === scriptId;

    try {
      if (isMyRunning && running) {
        await window.api.queue.remove(running.itemId);
        return;
      }
      setError(null);
      await window.api.queue.enqueue(scriptId, steps);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to run weekly battle steps"
      );
    }
  };

  return (
    <Card className="relative">
      <CardHeader>
        <div className="relative">
          <CardTitle className="text-center">
            {data ? (
              <>
                <div className="font-semibold text-lg">
                  {data.info.bossName}
                </div>
                <div className="mt-1 font-medium text-base">
                  {new Date(data.info.dateFrom).toLocaleDateString()} -{" "}
                  {new Date(data.info.dateTo).toLocaleDateString()}
                </div>
              </>
            ) : (
              "Weekly Battle"
            )}
          </CardTitle>
          <Button
            className="absolute top-0 right-0"
            disabled={loading}
            onClick={handleFetch}
            size="sm"
          >
            {loading ? "Fetching..." : "Refetch Data"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        )}

        {!(data || error) && (
          <div className="text-muted-foreground">No data available</div>
        )}

        {data && (
          <div className="space-y-6">
            {data.info.steps && data.info.steps.length > 0 && (
              <div className="grid grid-cols-2 gap-6">
                {data.info.steps.map((step, index) => {
                  const isSkulls = step.stepName
                    .toLowerCase()
                    .includes("skull");
                  const isRunning =
                    running?.scriptId === "world2.weeklyBattle.run";
                  const buttonText = isRunning
                    ? "Running... (Click to stop)"
                    : isSkulls
                      ? "Start skulls"
                      : "Start trophy";
                  return (
                    <div className="space-y-3" key={index}>
                      <div className="text-center font-semibold text-sm uppercase">
                        {step.stepName}
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => handleRun(step.steps, step.stepName)}
                        size="sm"
                      >
                        {buttonText}
                      </Button>
                      <div className="space-y-2">
                        {step.rawSteps && step.rawSteps.length > 0 ? (
                          step.rawSteps.map((rawStep, stepIndex) => (
                            <div
                              className="rounded bg-background/50 p-2 text-center text-muted-foreground text-xs"
                              key={stepIndex}
                            >
                              {rawStep}
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted-foreground text-xs">
                            No steps available
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyBattle;
