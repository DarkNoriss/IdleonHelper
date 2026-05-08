import { create } from "zustand";
import { useUiPrefsStore } from "@/store/ui-prefs";
import type {
  ParsedConstructionData,
  SolverFocus,
  SolverResult,
  SolverWeights,
} from "@/types/construction";
import type { QueueSnapshot } from "@/types/scripts";

type ConstructionSolverState = {
  result: SolverResult | null;
  error: string | null;
  isStarting: boolean;
  isCancelling: boolean;

  solve: (
    data: ParsedConstructionData,
    focus: SolverFocus,
    solveTimeMs: number
  ) => Promise<void>;
  cancel: () => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
};

export const useConstructionSolverStore = create<ConstructionSolverState>(
  (set, get) => ({
    result: null,
    error: null,
    isStarting: false,
    isCancelling: false,

    solve: async (data, focus, solveTimeMs) => {
      set({ result: null, error: null, isStarting: true });
      try {
        const weights: SolverWeights = { focus, flaggy: 0 };
        const out = await window.api.script.world3.construction.solver(
          data,
          weights,
          solveTimeMs
        );
        if (out) {
          set({ result: out, isStarting: false });
        } else {
          // hard-cancel timeout in the orchestrator resolves with null
          set({ isStarting: false });
        }
      } catch (err) {
        set({
          error:
            err instanceof Error ? err.message : "Failed to solve construction",
          isStarting: false,
        });
      }
    },

    cancel: async () => {
      if (get().isCancelling) {
        return;
      }
      set({ isCancelling: true });
      try {
        await window.api.script.world3.construction.solverCancel();
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Failed to cancel solver",
        });
      } finally {
        set({ isCancelling: false });
      }
    },

    clearResult: () => set({ result: null }),
    clearError: () => set({ error: null }),
  })
);

// Module-level queue subscription. Clears stale solver result and stamps the
// apply-run timestamp on every world3.construction.apply running -> idle
// transition. Lives for the renderer lifetime so it fires regardless of which
// page is mounted - the construction page is the only entry point that can
// enqueue an apply, so by the time apply runs this module is loaded.
let wasApplyActive = false;
window.api.state.subscribe("queue", (raw) => {
  const snap = raw as QueueSnapshot;
  const isApplyActive =
    snap.runningItem?.scriptId === "world3.construction.apply" ||
    snap.queue.some((i) => i.scriptId === "world3.construction.apply");
  if (wasApplyActive && !isApplyActive) {
    useConstructionSolverStore.setState({ result: null, error: null });
    useUiPrefsStore
      .getState()
      .setConstructionApplyRun({ lastRunAt: Date.now() });
  }
  wasApplyActive = isApplyActive;
});
