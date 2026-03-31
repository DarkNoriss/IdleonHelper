import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMainState } from "@/hooks/use-main-state";

export const StoreItems = () => {
  const [error, setError] = useState<string | null>(null);
  const [activeScript, setActiveScript] = useState<string | null>(null);
  const scriptStatus = useMainState("scriptStatus");
  const isWorking = scriptStatus?.isWorking ?? false;

  const isStoreItemsRunning = activeScript === "general.storeItems";

  const handleStoreItems = async () => {
    if (isStoreItemsRunning) {
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
    setActiveScript("general.storeItems");

    try {
      await window.api.script.run("general.storeItems.run");
    } catch (err) {
      if (
        !(err instanceof Error && err.message === "Operation was cancelled")
      ) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to run store items script"
        );
      }
    } finally {
      setActiveScript(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Store Items</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <div className="text-center text-muted-foreground text-sm">
            Navigate to the storage screen
          </div>
          <Button
            className="min-w-48"
            disabled={isWorking && !isStoreItemsRunning}
            onClick={handleStoreItems}
            size="lg"
          >
            {isStoreItemsRunning
              ? "Running... (Click to stop)"
              : "Start Store Items"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
