import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScriptStatusStore } from "@/store/script-status";

type WeeklyBattleStep = {
  stepName: string;
  steps: number[];
  rawSteps: string[];
};

type WeeklyBattleInfo = {
  dateFrom: string;
  dateTo: string;
  bossName: string;
  steps: WeeklyBattleStep[];
};

type WeeklyBattleData = {
  fetchedAt: string;
  info: WeeklyBattleInfo;
};

export const WeeklyBattle = () => {
  const [data, setData] = useState<WeeklyBattleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentScript = useScriptStatusStore((state) => state.currentScript);
  const setCurrentScript = useScriptStatusStore(
    (state) => state.setCurrentScript
  );

  const isWorking = currentScript !== null;

  const loadData = useCallback(async () => {
    try {
      const result = await window.api.script.world2.weeklyBattle.get();
      setData(result);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load weekly battle data"
      );
    }
  }, []);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.script.world2.weeklyBattle.fetch();
      setData(result);
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
    // Determine which script name to use based on step name
    const scriptName = stepName.toLowerCase().includes("skull")
      ? "weeklyBattle.skulls"
      : "weeklyBattle.trophy";
    const isThisButtonRunning = currentScript === scriptName;
    // If this specific button is already running, cancel it
    if (isThisButtonRunning) {
      try {
        await window.api.script.cancel();
        setCurrentScript(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to cancel operation"
        );
      }
      return;
    }

    // If already working with a different script, show error
    if (isWorking) {
      setError("Another operation is already running");
      return;
    }

    setError(null);
    setCurrentScript(
      scriptName as "weeklyBattle.skulls" | "weeklyBattle.trophy"
    );

    try {
      await window.api.script.world2.weeklyBattle.run(steps);
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        // User cancelled, don't show error
        setCurrentScript(null);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to run weekly battle steps"
        );
        setCurrentScript(null);
      }
    }
  };

  useEffect(() => {
    loadData();

    const cleanup = window.api.script.world2.weeklyBattle.onChange(
      (newData) => {
        setData(newData);
      }
    );

    return cleanup;
  }, [loadData]);

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
                  const isThisButtonRunning = currentScript === scriptName;
                  // Disable if another script is working, or if the other weekly battle button is running
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
