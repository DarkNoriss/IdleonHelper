import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMainState } from "@/hooks/use-main-state";

export const WeeklyBattle = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeScript, setActiveScript] = useState<string | null>(null);
  const scriptStatus = useMainState("scriptStatus");
  const weeklyBattle = useMainState("weeklyBattle");
  const isWorking = scriptStatus?.isWorking ?? false;
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

  const handleRun = async (steps: number[], stepName: string) => {
    const scriptName = stepName.toLowerCase().includes("skull")
      ? "weeklyBattle.skulls"
      : "weeklyBattle.trophy";
    const isThisButtonRunning = activeScript === scriptName;

    if (isThisButtonRunning) {
      try {
        await window.api.script.cancel();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to cancel operation"
        );
      }
      return;
    }

    if (isWorking) {
      setError("Another operation is already running");
      return;
    }

    setError(null);
    setActiveScript(scriptName);

    try {
      await window.api.script.run("world2.weeklyBattle.run", steps);
    } catch (err) {
      if (
        !(err instanceof Error && err.message === "Operation was cancelled")
      ) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to run weekly battle steps"
        );
      }
    } finally {
      setActiveScript(null);
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
                  const scriptName = isSkulls
                    ? "weeklyBattle.skulls"
                    : "weeklyBattle.trophy";
                  const isThisButtonRunning = activeScript === scriptName;
                  const isDisabled = isWorking && !isThisButtonRunning;
                  const buttonText = isThisButtonRunning
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
                        disabled={isDisabled}
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
