import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScriptStatusStore } from "@/store/script-status";

export const StoreItems = () => {
  const [error, setError] = useState<string | null>(null);
  const currentScript = useScriptStatusStore((state) => state.currentScript);
  const setCurrentScript = useScriptStatusStore(
    (state) => state.setCurrentScript
  );

  const isStoreItemsRunning = currentScript === "general.storeItems";
  const isWorking = currentScript !== null;

  const handleStoreItems = async () => {
    // If already working and this is the running mode, cancel it
    if (isStoreItemsRunning) {
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
    setCurrentScript("general.storeItems");

    try {
      await window.api.script.run("general.storeItems.run");
    } catch (err) {
      if (err instanceof Error && err.message === "Operation was cancelled") {
        // User cancelled, don't show error
        setCurrentScript(null);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to run store items script"
        );
        setCurrentScript(null);
      }
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
