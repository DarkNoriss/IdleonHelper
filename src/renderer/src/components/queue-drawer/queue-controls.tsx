import { Play, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import type { QueueSnapshot } from "@/types/scripts";

type Props = {
  queue: QueueSnapshot;
};

export const QueueControls = ({ queue }: Props) => {
  const canStart = queue.engineState === "paused";
  const canStop = queue.engineState === "running";
  const canClear = queue.queue.some((i) => i.status === "queued");

  return (
    <div className="flex gap-1.5">
      <Button
        className="flex-1"
        disabled={!canStart}
        onClick={() => window.api.queue.resume()}
        size="sm"
        variant="outline"
      >
        <Play className="h-3.5 w-3.5" /> Start
      </Button>
      <Button
        className="flex-1"
        disabled={!canStop}
        onClick={() => window.api.queue.pause()}
        size="sm"
        variant="outline"
      >
        <Square className="h-3.5 w-3.5" /> Stop
      </Button>
      <Button
        className="flex-1"
        disabled={!canClear}
        onClick={() => window.api.queue.clear()}
        size="sm"
        variant="outline"
      >
        <Trash2 className="h-3.5 w-3.5" /> Clear
      </Button>
    </div>
  );
};
