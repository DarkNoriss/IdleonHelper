import { ChevronLeft, ChevronRight, Loader2, Pause } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useMainState } from "@/hooks/use-main-state.ts";
import { useQueueDrawerStore } from "@/store/queue-drawer.ts";
import { QueueControls } from "./queue-controls.tsx";
import { QueueItemRow } from "./queue-item-row.tsx";

export const QueueDrawer = () => {
  const queue = useMainState("queue");
  const expanded = useQueueDrawerStore((s) => s.expanded);
  const toggle = useQueueDrawerStore((s) => s.toggle);

  if (!queue) {
    return null;
  }

  const running = queue.runningItem;
  const queuedOnly = queue.queue.filter((i) => i.status === "queued");

  if (!expanded) {
    return (
      <button
        className="fixed top-1/2 right-0 z-40 flex h-32 w-12 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-l-md border border-border border-r-0 bg-card shadow-md hover:bg-accent"
        onClick={toggle}
        type="button"
      >
        {queue.engineState === "running" ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : queue.engineState === "paused" ? (
          <Pause className="h-4 w-4 text-muted-foreground" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
        )}
        <span className="font-medium text-xs">{queuedOnly.length}</span>
        <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="fixed top-0 right-0 z-40 flex h-full w-80 flex-col border-border border-l bg-card shadow-xl">
      <div className="flex items-center justify-between border-border border-b px-3 py-2">
        <h2 className="font-semibold text-sm">Queue</h2>
        <Button onClick={toggle} size="icon" variant="ghost">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-border border-b px-3 py-2">
        <QueueControls queue={queue} />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-2">
        {running && (
          <div>
            <div className="mb-1 text-muted-foreground text-xs uppercase tracking-wide">
              Running
            </div>
            <QueueItemRow isRunning item={running} />
          </div>
        )}

        {queuedOnly.length > 0 && (
          <div>
            <div className="mb-1 text-muted-foreground text-xs uppercase tracking-wide">
              Queued ({queuedOnly.length})
            </div>
            <div className="space-y-1.5">
              {queuedOnly.map((item) => (
                <QueueItemRow item={item} key={item.itemId} />
              ))}
            </div>
          </div>
        )}

        {!running && queuedOnly.length === 0 && (
          <div className="py-6 text-center text-muted-foreground text-sm">
            Queue is empty
          </div>
        )}
      </div>
    </div>
  );
};
