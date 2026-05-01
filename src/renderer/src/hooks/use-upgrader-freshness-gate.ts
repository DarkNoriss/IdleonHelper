import { useEffect, useRef } from "react";
import { useMainState } from "@/hooks/use-main-state";
import { useConnectionStore } from "@/store/connection";
import type { ScriptMap } from "@/types/scripts";

type Args = {
  scriptId: keyof ScriptMap;
  lastRunAt: number | null;
  setLastRunAt: (ms: number) => void;
};

// Encapsulates the upgrader "freshness gate":
// - Stamps `lastRunAt` on the running -> idle transition (so a cloudsave that
//   fires DURING the run isn't mistaken for fresh post-run data).
// - Reports `dataIsStale = true` until a cloudsave landed strictly after
//   `lastRunAt`. Run button should be locked while stale.
export function useUpgraderFreshnessGate({
  scriptId,
  lastRunAt,
  setLastRunAt,
}: Args): { dataIsStale: boolean; isRunning: boolean } {
  const cloudsaveLastUpdated = useConnectionStore((s) => s.lastUpdated);
  const queue = useMainState("queue");
  const isRunning = queue?.runningItem?.scriptId === scriptId;

  const wasRunningRef = useRef(false);
  useEffect(() => {
    if (wasRunningRef.current && !isRunning) {
      setLastRunAt(Date.now());
    }
    wasRunningRef.current = isRunning;
  }, [isRunning, setLastRunAt]);

  const dataIsStale =
    lastRunAt !== null &&
    (cloudsaveLastUpdated === null || cloudsaveLastUpdated <= lastRunAt);

  return { dataIsStale, isRunning };
}
