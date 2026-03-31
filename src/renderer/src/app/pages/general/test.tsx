import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMainState } from "@/hooks/use-main-state";

export const Test = () => {
  const [error, setError] = useState<string | null>(null);
  const [activeScript, setActiveScript] = useState<string | null>(null);
  const scriptStatus = useMainState("scriptStatus");
  const isWorking = scriptStatus?.isWorking ?? false;

  const isTestRunning = activeScript === "general.test";

  const handleTest = async () => {
    if (isTestRunning) {
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
    setActiveScript("general.test");

    try {
      await window.api.script.run("general.test.run");
    } catch (err) {
      if (
        !(err instanceof Error && err.message === "Operation was cancelled")
      ) {
        setError(
          err instanceof Error ? err.message : "Failed to run test script"
        );
      }
    } finally {
      setActiveScript(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Test</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <div className="text-center text-muted-foreground text-sm">
            Test script that waits for 30 seconds
          </div>
          <Button
            className="min-w-48"
            disabled={isWorking && !isTestRunning}
            onClick={handleTest}
            size="lg"
          >
            {isTestRunning ? "Running... (Click to stop)" : "Start Test"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
