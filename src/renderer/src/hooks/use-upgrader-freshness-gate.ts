import { useEffect, useRef } from "react";
import { useMainState } from "@/hooks/use-main-state";
import { useConnectionStore } from "@/store/connection";
import type { ScriptMap } from "@/types/scripts";
import type { UpgraderStep } from "@/types/upgrader";

type Args = {
  scriptId: keyof ScriptMap;
  lastRunAt: number | null;
  setLastRunAt: (ms: number) => void;
  // When all four are present, the hook switches on STRICT freshness: it
  // snapshots upgrade levels at idle->running, then waits for at least one
  // planned upgrade index to actually move past its snapshot value. Idleon's
  // cloudsave lastUpdated timestamp can advance with stale upgradeLevels (the
  // game serializes a save a moment before our click lands), so we cannot
  // trust the timestamp alone - real value change is the only safe signal.
  // Without these fields, the hook falls back to the timestamp-based gate.
  getCurrentLevels?: () => readonly number[];
  getPlannedSteps?: () => readonly UpgraderStep[];
  upgradeNameOf?: (index: number) => string;
  logPrefix?: string;
};

// Encapsulates the upgrader "freshness gate":
// - Stamps `lastRunAt` on the running -> idle transition.
// - Reports `dataIsStale = true` until either a planned upgrade level has
//   actually changed (strict mode) or a cloudsave landed strictly after
//   `lastRunAt` (fallback). Run button should be locked while stale.
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

  useEffect(() => {
    if (!wasRunningRef.current && isRunning) {
      // idle -> running: capture pre-run snapshot so the strict gate has a
      // baseline to compare against.
      snapshotRef.current = getCurrentLevels?.() ?? null;
      plannedRef.current = getPlannedSteps?.() ?? null;
    }
    if (wasRunningRef.current && !isRunning) {
      // running -> idle: stamp run end. Strict gate now waits for a planned
      // index to move; fallback gate waits for a cloudsave timestamp advance.
      setLastRunAt(Date.now());
    }
    wasRunningRef.current = isRunning;
  }, [isRunning, setLastRunAt, getCurrentLevels, getPlannedSteps]);

  // Strict change detection happens at render time so dataIsStale reacts the
  // moment the underlying upgradeLevels reference updates (a real cloudsave
  // landed). Refs are intentionally NOT cleared after the diff fires - they
  // must persist so dataIsStale stays false until the next run starts.
  const snapshot = snapshotRef.current;
  const planned = plannedRef.current;
  const current = getCurrentLevels?.();
  const isStrictMode =
    getCurrentLevels !== undefined && getPlannedSteps !== undefined;
  const haveSnapshot =
    snapshot !== null && planned !== null && current !== undefined;
  const levelsChanged =
    haveSnapshot &&
    current.length > 0 &&
    planned.some(
      (step) => (current[step.index] ?? 0) !== (snapshot[step.index] ?? 0)
    );

  const dataIsStale =
    lastRunAt !== null &&
    (isStrictMode && haveSnapshot
      ? !levelsChanged
      : cloudsaveLastUpdated === null || cloudsaveLastUpdated <= lastRunAt);

  // Diff fires once on the dataIsStale: true -> false transition. With strict
  // mode that transition happens exactly when a planned upgrade actually
  // moved, so the diff is comparing real post-save data rather than racing
  // against a stale-but-fresh-timestamped save.
  useEffect(() => {
    const wasStale = wasStaleRef.current;
    wasStaleRef.current = dataIsStale;
    if (!(wasStale && !dataIsStale)) {
      return;
    }
    const snap = snapshotRef.current;
    const plan = plannedRef.current;
    if (!(snap && plan) || plan.length === 0) {
      return;
    }
    const cur = getCurrentLevels?.();
    if (!cur || cur.length === 0) {
      return;
    }
    const expectedByIndex = new Map<number, number>();
    for (const step of plan) {
      expectedByIndex.set(
        step.index,
        (expectedByIndex.get(step.index) ?? 0) + step.levels
      );
    }
    const prefix = logPrefix ?? scriptId;
    const messages: string[] = [];
    for (const [index, expectedDelta] of expectedByIndex) {
      const before = snap[index] ?? 0;
      const after = cur[index] ?? 0;
      const actualDelta = after - before;
      if (actualDelta === expectedDelta) {
        continue;
      }
      const name = upgradeNameOf?.(index) ?? "?";
      const drift = actualDelta - expectedDelta;
      const sign = drift > 0 ? "+" : "";
      const expected = before + expectedDelta;
      messages.push(
        `[${prefix}] #${index} ${name} expected ${expected} got ${after} (${sign}${drift})`
      );
    }
    if (messages.length === 0) {
      return;
    }
    for (const message of messages) {
      try {
        window.api.logs.warn(message);
      } catch {
        // Fall back to renderer console if the IPC bridge is somehow missing,
        // so we never silently lose the diagnostic.
        console.warn(message);
      }
    }
  }, [dataIsStale, getCurrentLevels, upgradeNameOf, logPrefix, scriptId]);

  return { dataIsStale, isRunning };
}
