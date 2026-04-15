import { AlertCircle, Loader2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useMainState } from "@/hooks/use-main-state.ts";
import type { ScriptMap } from "@/types/scripts";

export type ScriptAction<T extends keyof ScriptMap = keyof ScriptMap> = {
  label: string;
  scriptId: T;
  runningLabel?: string;
  queuedLabel?: string;
  disabled?: boolean;
  args?: () => ScriptMap[T]["args"];
};

type ScriptPageProps = {
  title: string;
  actions: ScriptAction[];
  children?: ReactNode;
};

export const ScriptPage = ({ title, actions, children }: ScriptPageProps) => {
  const [error, setError] = useState<string | null>(null);
  const queue = useMainState("queue");
  const running = queue?.runningItem ?? null;
  const queuedItems = queue?.queue ?? [];

  const makeHandler = (action: ScriptAction) => async () => {
    const myRunning = running?.scriptId === action.scriptId ? running : null;
    const myQueued = queuedItems.find(
      (i) => i.scriptId === action.scriptId && i.status === "queued"
    );

    try {
      if (myRunning) {
        await window.api.queue.remove(myRunning.itemId);
        return;
      }
      if (myQueued) {
        await window.api.queue.remove(myQueued.itemId);
        return;
      }
      setError(null);
      const args = action.args?.() ?? [];
      await (
        window.api.queue.enqueue as (
          id: keyof ScriptMap,
          ...args: unknown[]
        ) => Promise<{ itemId: string }>
      )(action.scriptId, ...(args as unknown[]));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to run ${action.label}`
      );
    }
  };

  const buttonGrid =
    actions.length === 1 ? "grid grid-cols-1" : "grid grid-cols-2 gap-6";

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {children}

        <div className={buttonGrid}>
          {actions.map((action) => {
            const myRunning = running?.scriptId === action.scriptId;
            const myQueued = queuedItems.some(
              (i) => i.scriptId === action.scriptId && i.status === "queued"
            );
            const runningLabel =
              action.runningLabel ?? "Running... (Click to stop)";
            const queuedLabel =
              action.queuedLabel ?? "Queued (click to remove)";

            return (
              <div key={action.scriptId}>
                <Button
                  className="w-full"
                  disabled={action.disabled}
                  onClick={makeHandler(action)}
                  size="sm"
                >
                  {myRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {runningLabel}
                    </>
                  ) : myQueued ? (
                    queuedLabel
                  ) : (
                    action.label
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
