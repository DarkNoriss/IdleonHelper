import { Loader2, Repeat, X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import type { QueueItem } from "@/types/scripts";

type Props = {
  item: QueueItem;
  isRunning?: boolean;
};

const formatNextRun = (nextRunAt: number): string => {
  const diff = nextRunAt - Date.now();
  if (diff <= 0) {
    return "soon";
  }
  const date = new Date(nextRunAt);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const QueueItemRow = ({ item, isRunning }: Props) => {
  const handleRemove = async () => {
    await window.api.queue.remove(item.itemId);
  };

  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card/60 px-2 py-1.5 text-sm">
      {isRunning ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
      ) : item.recurring ? (
        <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/40" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{item.scriptName}</div>
        {item.recurring && !isRunning && (
          <div className="text-muted-foreground text-xs">
            next: {formatNextRun(item.nextRunAt)}
          </div>
        )}
        {item.lastError && (
          <div className="truncate text-destructive text-xs">
            {item.lastError}
          </div>
        )}
      </div>
      <Button
        className="h-6 w-6 shrink-0"
        onClick={handleRemove}
        size="icon"
        variant="ghost"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
