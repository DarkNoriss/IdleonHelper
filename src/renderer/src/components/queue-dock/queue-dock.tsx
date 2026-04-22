import { useEffect, useState } from "react";
import { useMainState } from "@/hooks/use-main-state";
import type { QueueItem } from "@/types/scripts";

const formatElapsed = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

export const QueueDock = () => {
  const queue = useMainState("queue");
  const running = queue?.runningItem ?? null;
  const queued = (queue?.queue ?? []).filter((i) => i.status === "queued");
  const total = (running ? 1 : 0) + queued.length;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) {
      return;
    }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const elapsed = running ? formatElapsed(now - running.enqueuedAt) : "00:00";

  const handleStop = () => {
    if (running) {
      window.api.queue.remove(running.itemId).catch(() => {
        // IPC failures here would only happen if the backend went away; the
        // queue state subscription will reconcile on the next tick.
      });
    }
  };

  const handleClearAll = () => {
    window.api.queue.clear().catch(() => {
      // same — queue state subscription reconciles next tick.
    });
  };

  const handleRemove = (item: QueueItem) => {
    window.api.queue.remove(item.itemId).catch(() => {
      // same — queue state subscription reconciles next tick.
    });
  };

  return (
    <div className="flex min-h-[78px] shrink-0 flex-col border-border border-t bg-panel font-mono">
      <div className="flex h-[22px] items-center justify-between border-border-soft border-b px-2.5 text-[10px]">
        <div className="flex items-center gap-2.5">
          <span className="text-primary">▣</span>
          <span className="font-medium text-foreground">queue</span>
          <span className="text-text-muted">
            {running ? "1" : "0"} running · {queued.length} queued
          </span>
          {total > 0 && (
            <button
              className="cursor-pointer border-none bg-transparent px-1 font-mono text-[10px] text-text-dim hover:text-foreground"
              onClick={handleClearAll}
              type="button"
            >
              × clear all
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-[56px] flex-1 items-center gap-2 px-2.5">
        {running ? (
          <>
            <span className="inline-block h-2 w-2 shrink-0 animate-v3pulse rounded-full bg-primary" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] text-foreground">
                <span className="text-primary">❯</span>
                <span className="truncate font-medium">
                  {running.scriptName}
                </span>
                <span className="shrink-0 text-[10px] text-text-muted">
                  · {elapsed}
                </span>
              </div>
              <div className="relative h-0.5 overflow-hidden rounded-[1px] bg-surface">
                <div className="absolute inset-y-0 left-0 w-1/3 animate-v3indeterminate bg-primary" />
              </div>
            </div>
            <button
              className="shrink-0 cursor-pointer rounded-[3px] border border-primary-dim bg-transparent px-2.5 py-1 font-mono text-[10px] text-amber hover:bg-primary-dim/10"
              onClick={handleStop}
              type="button"
            >
              ■ stop
            </button>
            {queued.length > 0 && (
              <>
                <span className="mx-1 h-9 w-px shrink-0 bg-border-soft" />
                <div className="flex shrink-0 gap-1 overflow-hidden">
                  {queued.slice(0, 3).map((q, i) => (
                    <div
                      className="flex items-center gap-1.5 rounded-[3px] border border-border-soft bg-surface px-1.5 py-0.5 text-[10px] text-text-dim"
                      key={q.itemId}
                    >
                      <span className="text-text-muted">{i + 2}</span>
                      <span className="max-w-[120px] truncate">
                        {q.scriptName}
                      </span>
                      <button
                        className="cursor-pointer border-none bg-transparent p-0 font-mono text-[10px] text-text-muted leading-none hover:text-destructive"
                        onClick={() => handleRemove(q)}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {queued.length > 3 && (
                    <span className="self-center px-1 text-[10px] text-text-muted">
                      +{queued.length - 3}
                    </span>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="font-mono text-[10.5px] text-text-muted">
            <span className="text-primary">$</span> queue is empty — pick a
            script from the sidebar and press start
          </div>
        )}
      </div>
    </div>
  );
};
