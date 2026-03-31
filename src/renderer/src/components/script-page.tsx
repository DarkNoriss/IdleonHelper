import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMainState } from "@/hooks/use-main-state";
import type { ScriptMap } from "@/types/scripts";

export type ScriptAction<T extends keyof ScriptMap = keyof ScriptMap> = {
  label: string;
  scriptId: T;
  runningLabel?: string;
  args?: () => ScriptMap[T]["args"];
  onResult?: (result: ScriptMap[T]["result"]) => void;
};

type ScriptPageProps = {
  title: string;
  actions: ScriptAction[];
  children?: ReactNode;
};

export const ScriptPage = ({ title, actions, children }: ScriptPageProps) => {
  const [error, setError] = useState<string | null>(null);
  const [activeScript, setActiveScript] = useState<string | null>(null);
  const scriptStatus = useMainState("scriptStatus");
  const isWorking = scriptStatus?.isWorking ?? false;

  const makeHandler = (action: ScriptAction) => async () => {
    const isThisRunning = activeScript === action.scriptId;

    if (isThisRunning) {
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
    setActiveScript(action.scriptId);

    try {
      const args = action.args?.() ?? [];
      const result = await (
        window.api.script.run as (
          id: keyof ScriptMap,
          ...args: unknown[]
        ) => Promise<unknown>
      )(action.scriptId, ...(args as unknown[]));
      (action.onResult as ((result: unknown) => void) | undefined)?.(result);
    } catch (err) {
      if (
        !(err instanceof Error && err.message === "Operation was cancelled")
      ) {
        setError(
          err instanceof Error ? err.message : `Failed to run ${action.label}`
        );
      }
    } finally {
      setActiveScript(null);
    }
  };

  const buttonGrid =
    actions.length === 1 ? "flex justify-center" : "grid grid-cols-2 gap-6";

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        )}

        {children}

        <div className={buttonGrid}>
          {actions.map((action) => {
            const isThisRunning = activeScript === action.scriptId;
            const runningLabel =
              action.runningLabel ?? "Running... (Click to stop)";

            return (
              <div className="space-y-3" key={action.scriptId}>
                <div className="text-center font-semibold text-sm uppercase">
                  {action.label}
                </div>
                <Button
                  className="w-full"
                  disabled={isWorking && !isThisRunning}
                  onClick={makeHandler(action)}
                  size="sm"
                >
                  {isThisRunning ? runningLabel : action.label}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
