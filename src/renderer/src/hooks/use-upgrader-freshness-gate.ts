import { useEffect, useRef } from "react";
import { useMainState } from "@/hooks/use-main-state";
import { useConnectionStore } from "@/store/connection";
import type { ScriptMap } from "@/types/scripts";
import type { UpgraderStep } from "@/types/upgrader";

type Args = {
  scriptId: keyof ScriptMap;
  lastRunAt: number | null;
  setLastRunAt: (ms: number) => void;
  // When all four are present, the hook also runs a debug diff: it snapshots
  // upgrade levels at idle->running, then on the next cloudsave that lands
  // strictly after lastRunAt it compares actual deltas against planned
  // deltas and logs a single warn line via window.api.logs.warn on mismatch.
  getCurrentLevels?: () => readonly number[];
  getPlannedSteps?: () => readonly UpgraderStep[];
  upgradeNameOf?: (index: number) => string;
  logPrefix?: string;
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
  getCurrentLevels,
  getPlannedSteps,
  upgradeNameOf,
  logPrefix,
}: Args): { dataIsStale: boolean; isRunning: boolean } {
  const cloudsaveLastUpdated = useConnectionStore((s) => s.lastUpdated);
  const queue = useMainState("queue");
  const isRunning = queue?.runningItem?.scriptId === scriptId;

  const wasRunningRef = useRef(false);
  const snapshotRef = useRef<readonly number[] | null>(null);
  const plannedRef = useRef<readonly UpgraderStep[] | null>(null);
  const wasStaleRef = useRef(false);

  // Stamp lastRunAt on running -> idle. Snapshot levels + planned steps on
  // idle -> running so the diff can compare against pre-run state.
  useEffect(() => {
    if (!wasRunningRef.current && isRunning) {
      // idle -> running
      snapshotRef.current = getCurrentLevels?.() ?? null;
      plannedRef.current = getPlannedSteps?.() ?? null;
    }
    if (wasRunningRef.current && !isRunning) {
      // running -> idle
      setLastRunAt(Date.now());
    }
    wasRunningRef.current = isRunning;
  }, [isRunning, setLastRunAt, getCurrentLevels, getPlannedSteps]);

  const dataIsStale =
    lastRunAt !== null &&
    (cloudsaveLastUpdated === null || cloudsaveLastUpdated <= lastRunAt);

  // Run the diff exactly once on the dataIsStale: true -> false transition.
  // That transition only fires after a cloudsave whose timestamp is strictly
  // greater than lastRunAt - i.e. a cloudsave produced AFTER the run ended.
  // Mid-run cloudsaves are filtered by the gate above.
  useEffect(() => {
    const wasStale = wasStaleRef.current;
    wasStaleRef.current = dataIsStale;
    if (!(wasStale && !dataIsStale)) {
      return;
    }
    const snapshot = snapshotRef.current;
    const planned = plannedRef.current;
    snapshotRef.current = null;
    plannedRef.current = null;
    if (!(snapshot && planned) || planned.length === 0) {
      return;
    }
    const current = getCurrentLevels?.();
    if (!current || current.length === 0) {
      return;
    }
    const expectedByIndex = new Map<number, number>();
    for (const step of planned) {
      expectedByIndex.set(
        step.index,
        (expectedByIndex.get(step.index) ?? 0) + step.levels
      );
    }
    const overs: string[] = [];
    const unders: string[] = [];
    for (const [index, expectedDelta] of expectedByIndex) {
      const before = snapshot[index] ?? 0;
      const after = current[index] ?? 0;
      const actualDelta = after - before;
      if (actualDelta === expectedDelta) {
        continue;
      }
      const name = upgradeNameOf?.(index) ?? "?";
      const drift = actualDelta - expectedDelta;
      const sign = drift > 0 ? "+" : "";
      const desc = `#${index} ${name} expected +${expectedDelta} got +${actualDelta} (${sign}${drift})`;
      if (actualDelta > expectedDelta) {
        overs.push(desc);
      } else {
        unders.push(desc);
      }
    }
    if (overs.length === 0 && unders.length === 0) {
      return;
    }
    const prefix = logPrefix ?? scriptId;
    const total = overs.length + unders.length;
    const parts: string[] = [];
    if (overs.length > 0) {
      parts.push(`over: ${overs.join(", ")}`);
    }
    if (unders.length > 0) {
      parts.push(`under: ${unders.join(", ")}`);
    }
    const message = `[${prefix}] state diff after run: ${total} mismatch(es) on ${planned.length} planned step(s) - ${parts.join(", ")}`;
    try {
      window.api.logs.warn(message);
    } catch {
      // Fall back to renderer console if the IPC bridge is somehow missing,
      // so we never silently lose the diagnostic.
      console.warn(message);
    }
  }, [dataIsStale, getCurrentLevels, upgradeNameOf, logPrefix, scriptId]);

  return { dataIsStale, isRunning };
}
