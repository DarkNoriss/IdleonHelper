import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMainState } from "@/hooks/use-main-state";

export const Summoning = () => {
  const [error, setError] = useState<string | null>(null);
  const [activeScript, setActiveScript] = useState<string | null>(null);
  const scriptStatus = useMainState("scriptStatus");
  const isWorking = scriptStatus?.isWorking ?? false;

  const isEndlessRunning = activeScript === "summoning.endless";
  const isAutobattlerRunning = activeScript === "summoning.autobattler";

  const handleEndlessAutobattler = async () => {
    if (isEndlessRunning) {
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
    setActiveScript("summoning.endless");

    try {
      await window.api.script.run("world6.summoning.startEndlessAutobattler");
    } catch (err) {
      if (
        !(err instanceof Error && err.message === "Operation was cancelled")
      ) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to start endless autobattler"
        );
      }
    } finally {
      setActiveScript(null);
    }
  };

  const handleAutobattler = async () => {
    if (isAutobattlerRunning) {
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
    setActiveScript("summoning.autobattler");

    try {
      await window.api.script.run("world6.summoning.startAutobattler");
    } catch (err) {
      if (
        !(err instanceof Error && err.message === "Operation was cancelled")
      ) {
        setError(
          err instanceof Error ? err.message : "Failed to start autobattler"
        );
      }
    } finally {
      setActiveScript(null);
    }
  };

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="text-center">Summoning</CardTitle>
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
              Endless Autobattler
            </div>
            <Button
              className="w-full"
              disabled={isWorking && !isEndlessRunning}
              onClick={handleEndlessAutobattler}
              size="sm"
            >
              {isEndlessRunning
                ? "Running... (Click to stop)"
                : "Start Endless Autobattler"}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="text-center font-semibold text-sm uppercase">
              Autobattler
            </div>
            <Button
              className="w-full"
              disabled={isWorking && !isAutobattlerRunning}
              onClick={handleAutobattler}
              size="sm"
            >
              {isAutobattlerRunning
                ? "Running... (Click to stop)"
                : "Start Autobattler"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
