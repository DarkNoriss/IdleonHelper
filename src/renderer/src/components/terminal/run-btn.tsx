import { useEffect, useState } from "react";
import { useMainState } from "@/hooks/use-main-state";
import { cn } from "@/lib/utils";
import type { ScriptMap } from "@/types/scripts";

type RunBtnProps<T extends keyof ScriptMap = keyof ScriptMap> = {
  scriptId: T;
  label: string;
  getArgs?: () => ScriptMap[T]["args"];
  disabled?: boolean;
  small?: boolean;
  className?: string;
};

type RunState = "idle" | "running" | "queued";

export const RunBtn = <T extends keyof ScriptMap>({
  scriptId,
  label,
  getArgs,
  disabled,
  small,
  className,
}: RunBtnProps<T>) => {
  const queue = useMainState("queue");
  const [error, setError] = useState<string | null>(null);

  const runningItem =
    queue?.runningItem?.scriptId === scriptId ? queue.runningItem : null;
  const queuedItem =
    queue?.queue.find(
      (i) => i.scriptId === scriptId && i.status === "queued"
    ) ?? null;

  const state: RunState = runningItem
    ? "running"
    : queuedItem
      ? "queued"
      : "idle";

  // Drop any stale error as soon as the button transitions out of idle — a
  // successful new run has taken off. The click handler also clears upfront
  // so the error never lingers visually after a retry.
  useEffect(() => {
    if (state !== "idle") {
      setError(null);
    }
  }, [state]);

  const handleClick = async () => {
    setError(null);
    try {
      if (runningItem) {
        await window.api.queue.remove(runningItem.itemId);
        return;
      }
      if (queuedItem) {
        await window.api.queue.remove(queuedItem.itemId);
        return;
      }
      const args = (getArgs?.() ?? []) as ScriptMap[T]["args"];
      await window.api.queue.enqueue(scriptId, ...args);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to run ${label}`);
    }
  };

  const isDisabled = state === "idle" && disabled;

  const sizing = small
    ? "px-2.5 py-[5px] text-[10.5px]"
    : "px-3.5 py-1.5 text-[11px]";

  const base =
    "inline-flex select-none items-center gap-1.5 rounded-[3px] border font-mono font-semibold leading-none transition-colors disabled:cursor-default";

  const byState = {
    running:
      "border-primary-dim bg-transparent text-amber hover:bg-primary-dim/10",
    queued:
      "border-primary-dim bg-surface-hi text-amber hover:bg-surface-hi/80",
    idle: isDisabled
      ? "border-border bg-surface text-text-muted opacity-60"
      : "border-transparent bg-primary text-primary-ink hover:bg-primary-hover",
  } as const;

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        className={cn(base, sizing, byState[state], className)}
        disabled={isDisabled}
        onClick={handleClick}
        type="button"
      >
        {state === "running" ? (
          <>
            <span className="inline-block h-2 w-2 animate-v3spin rounded-full border-[1.5px] border-amber border-t-transparent" />
            running · click to stop
          </>
        ) : state === "queued" ? (
          "⋯ queued · click to cancel"
        ) : (
          <>
            <span>▶</span>
            <span>{label}</span>
          </>
        )}
      </button>
      {error && (
        <span className="font-mono text-[10px] text-destructive">{error}</span>
      )}
    </div>
  );
};
