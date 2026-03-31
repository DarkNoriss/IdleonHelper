import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMainState } from "@/hooks/use-main-state";

export const Farming = () => {
  const [error, setError] = useState<string | null>(null);
  const [activeScript, setActiveScript] = useState<string | null>(null);
  const scriptStatus = useMainState("scriptStatus");
  const isWorking = scriptStatus?.isWorking ?? false;

  const isFarmingRunning = activeScript === "farming";
  const isLockUnlockRunning = activeScript === "farming.lock-unlock";

  const handleStart = async () => {
    if (isFarmingRunning) {
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
    setActiveScript("farming");

    try {
      await window.api.script.run("world6.farming.start");
    } catch (err) {
      if (
        !(err instanceof Error && err.message === "Operation was cancelled")
      ) {
        setError(
          err instanceof Error ? err.message : "Failed to start farming"
        );
      }
    } finally {
      setActiveScript(null);
    }
  };

  const handleLockUnlock = async () => {
    if (isLockUnlockRunning) {
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
    setActiveScript("farming.lock-unlock");

    try {
      await window.api.script.run("world6.farming.lockUnlock");
    } catch (err) {
      if (
        !(err instanceof Error && err.message === "Operation was cancelled")
      ) {
        setError(
          err instanceof Error ? err.message : "Failed to lock/unlock crops"
        );
      }
    } finally {
      setActiveScript(null);
    }
  };

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="text-center">Farming</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-center font-semibold text-sm uppercase">
              Farming Script
            </div>
            <Button
              className="w-full"
              disabled={isWorking && !isFarmingRunning}
              onClick={handleStart}
              size="sm"
            >
              {isFarmingRunning
                ? "Running... (Click to stop)"
                : "Start Farming"}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="text-center font-semibold text-sm uppercase">
              Lock/Unlock Crops
            </div>
            <Button
              className="w-full"
              disabled={isWorking && !isLockUnlockRunning}
              onClick={handleLockUnlock}
              size="sm"
            >
              {isLockUnlockRunning
                ? "Running... (Click to stop)"
                : "Lock/Unlock Crops"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
