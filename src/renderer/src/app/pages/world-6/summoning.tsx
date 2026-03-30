import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScriptStatusStore } from "@/store/script-status";

export const Summoning = () => {
  const [error, setError] = useState<string | null>(null);
  const currentScript = useScriptStatusStore((state) => state.currentScript);
  const setCurrentScript = useScriptStatusStore(
    (state) => state.setCurrentScript
  );

  const isEndlessRunning = currentScript === "summoning.endless";
  const isAutobattlerRunning = currentScript === "summoning.autobattler";
  const isWorking = currentScript !== null;

  const handleEndlessAutobattler = async () => {
    // If already working and this is the running mode, cancel it
    if (isEndlessRunning) {
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

    // If already working with a different mode, show error
    if (isWorking) {
      setError("Another operation is already running");
      return;
    }

    setError(null);
    setCurrentScript("summoning.endless");

    try {
      await window.api.script.world6.summoning.startEndlessAutobattler();
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        // User cancelled, don't show error
        setCurrentScript(null);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to start endless autobattler"
        );
        setCurrentScript(null);
      }
    }
  };

  const handleAutobattler = async () => {
    // If already working and this is the running mode, cancel it
    if (isAutobattlerRunning) {
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

    // If already working with a different mode, show error
    if (isWorking) {
      setError("Another operation is already running");
      return;
    }

    setError(null);
    setCurrentScript("summoning.autobattler");

    try {
      await window.api.script.world6.summoning.startAutobattler();
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        // User cancelled, don't show error
        setCurrentScript(null);
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to start autobattler"
        );
        setCurrentScript(null);
      }
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
