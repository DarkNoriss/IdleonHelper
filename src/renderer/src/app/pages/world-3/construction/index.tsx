import { useEffect } from "react";
import {
  Alert,
  Block,
  BlockActions,
  Field,
  PageHead,
  RunBtn,
  ScoreCol,
  TermSelect,
} from "@/components/terminal";
import { DisabledHint } from "@/components/terminal/disabled-hint";
import { useMainState } from "@/hooks/use-main-state";
import { notateNumber } from "@/lib/notateNumber.ts";
import { signInWithGoogle } from "@/providers/auth-provider";
import { useGameData } from "@/providers/game-data-provider.tsx";
import { useConnectionStore, useIsSignedIn } from "@/store/connection";
import { useConstructionSolverStore } from "@/store/construction-solver";
import {
  type LoopFinalOutcome,
  SCORE_FIELD,
  useLoopSolveStore,
} from "@/store/loop-solve";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";
import type { OptimalStep, SolverFocus } from "@/types/construction.ts";

const SPARE_ROWS = 5;
const DEFAULT_SOLVE_TIME_SECONDS = 600;
const DEFAULT_FOCUS: SolverFocus = "exp";
const VALID_FOCUS: readonly SolverFocus[] = ["exp", "buildRate", "flaggy"];

const focusOptions = [
  { value: "exp", label: "exp-bonus" },
  { value: "buildRate", label: "build-rate" },
  { value: "flaggy", label: "flaggy" },
];

const getSparePage = (y: number): number => Math.floor(y / SPARE_ROWS) + 1;

const formatLocation = (
  location: OptimalStep["from"] | OptimalStep["to"]
): string => {
  const x = location.x + 1;
  const y = location.y + 1;
  if (location.location === "spare") {
    return `spare [${x}|${y}] page ${getSparePage(location.y)}`;
  }
  return `${location.location} [${x}|${y}]`;
};

const formatDiff = (current: number, optimized: number): string => {
  const diff = optimized - current;
  if (diff === 0) {
    return "";
  }
  const sign = diff > 0 ? "+" : "";
  return `${sign}${notateNumber(diff)}`;
};

// Display helper for primary readouts — no sign prefix; use formatPercentDiff for deltas.
const formatPercent = (n: number): string => `${notateNumber(n)}%`;

const formatPercentDiff = (current: number, optimized: number): string => {
  const diff = optimized - current;
  if (diff === 0) {
    return "";
  }
  const sign = diff > 0 ? "+" : "";
  return `${sign}${notateNumber(diff)}%`;
};

const pad = (n: number) => n.toString().padStart(2, "0");

const formatElapsed = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) {
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
};

const formatImprovement = (pct: number): string => {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
};

// Always show a sign (including +0.0%) so the loop's total-gain readout makes
// it visually clear that the loop ran, even when no net improvement was found.
const formatTotalGain = (pct: number): string => {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
};

const SCORE_FIELD_LABEL: Record<SolverFocus, string> = {
  exp: "exp-rate",
  buildRate: "build-rate",
  flaggy: "flaggy",
};

const formatOutcomeLine = (outcome: LoopFinalOutcome): string => {
  switch (outcome.kind) {
    case "completed-no-improvement":
      return `loop complete - ${outcome.iterations} iteration${outcome.iterations === 1 ? "" : "s"} - total gain ${formatTotalGain(outcome.totalGainPct)}`;
    case "completed-cap":
      return `loop stopped - ${outcome.iterations} iterations - cap reached - total gain ${formatTotalGain(outcome.totalGainPct)}`;
    case "cancelled":
      return `loop cancelled at iteration ${outcome.iterations}/10`;
    case "error":
      return `loop failed at iteration ${outcome.iterations}/10 - ${outcome.message}`;
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
};

const Construction = () => {
  const { construction: constructionData } = useGameData();
  const isSignedIn = useIsSignedIn();
  const focus = useUiPrefsStore((s) => s.construction.focus);
  const setConstruction = useUiPrefsStore((s) => s.setConstruction);
  const solverResult = useConstructionSolverStore((s) => s.result);
  const solverError = useConstructionSolverStore((s) => s.error);
  const isStarting = useConstructionSolverStore((s) => s.isStarting);
  const isCancelling = useConstructionSolverStore((s) => s.isCancelling);
  const solverSolve = useConstructionSolverStore((s) => s.solve);
  const solverCancelAction = useConstructionSolverStore((s) => s.cancel);
  const solverState = useMainState("constructionSolver");
  const progress = solverState?.progress ?? null;
  const isSolverActive = isStarting || progress !== null;
  const score = constructionData?.score;

  const queue = useMainState("queue");
  const loopStatus = useLoopSolveStore((s) => s.status);
  const loopIteration = useLoopSolveStore((s) => s.iteration);
  const loopLastImprovementPct = useLoopSolveStore((s) => s.lastImprovementPct);
  const loopStartScore = useLoopSolveStore((s) => s.startScore);
  const loopOutcome = useLoopSolveStore((s) => s.lastOutcome);
  const startLoop = useLoopSolveStore((s) => s.start);
  const stopLoop = useLoopSolveStore((s) => s.stop);
  const clearLoopOutcome = useLoopSolveStore((s) => s.clearOutcome);

  const isLoopRunning = loopStatus !== "idle";
  const queueHasOtherWork =
    Boolean(queue?.runningItem) || (queue?.queue.length ?? 0) > 0;

  const applyLastRunAt = useUiPrefsStore(
    (s) => s.constructionApplyRun.lastRunAt
  );
  const cloudsaveLastUpdated = useConnectionStore((s) => s.lastUpdated);
  const dataIsStale =
    applyLastRunAt !== null &&
    (cloudsaveLastUpdated === null || cloudsaveLastUpdated <= applyLastRunAt);
  const stalenessHint =
    "waiting for cog data to update - idleon hasn't synced post-apply state yet";

  const allSlotsUnlocked =
    constructionData === null
      ? false
      : constructionData.availableSlotKeys.length ===
        Object.keys(constructionData.slots).length -
          constructionData.flagPose.length;

  useEffect(() => {
    if (!VALID_FOCUS.includes(focus)) {
      setConstruction({ focus: DEFAULT_FOCUS });
    }
  }, [focus, setConstruction]);

  useEffect(() => {
    if (allSlotsUnlocked && focus === "flaggy") {
      setConstruction({ focus: DEFAULT_FOCUS });
    }
  }, [allSlotsUnlocked, focus, setConstruction]);

  const activeFocusOptions = allSlotsUnlocked
    ? focusOptions.filter((o) => o.value !== "flaggy")
    : focusOptions;

  const handleSolve = () => {
    if (!constructionData) {
      useConstructionSolverStore.setState({
        error: "No construction data available",
      });
      return;
    }
    solverSolve(
      constructionData,
      focus,
      DEFAULT_SOLVE_TIME_SECONDS * 1000
    ).catch(() => undefined);
  };

  const handleCancel = () => {
    if (!isSolverActive || isCancelling) {
      return;
    }
    solverCancelAction().catch(() => undefined);
  };

  const solved = solverResult !== null;
  const buildRate = solverResult?.score.buildRate ?? score?.buildRate ?? 0;
  const expBonus = solverResult?.score.expBonus ?? score?.expBonus ?? 0;
  const flaggy = solverResult?.score.flaggy ?? score?.flaggy ?? 0;
  const playerExpRate =
    solverResult?.score.playerExpRate ?? score?.playerExpRate ?? 0;
  const playerExpRateDiff =
    solved && score ? formatDiff(score.playerExpRate, playerExpRate) : "";

  const solverHint = (
    <>
      solver needs synced cog data from firebase.{" "}
      <button
        className="cursor-pointer border-none bg-transparent p-0 font-[inherit] text-[inherit] text-amber underline"
        onClick={() => {
          signInWithGoogle().catch(() => {
            // errors surface via the connection store
          });
        }}
        type="button"
      >
        sign in with google
      </button>{" "}
      to enable.
    </>
  );

  return (
    <>
      <PageHead path="world-3 / construction" title="construction" />
      {!isSignedIn && (
        <Alert tone="warn">
          solver is locked — sign in with google from the title bar to sync your
          cog data from firebase. collect/trash will still work.
        </Alert>
      )}
      {isLoopRunning && (
        <Alert tone="warn">
          loop solve {loopStatus === "cancelling" ? "stopping…" : "running"} —
          do not interact with the game.
          {loopStatus === "running" && (
            <>
              {" "}
              iteration {loopIteration} of 10
              {loopLastImprovementPct !== null && (
                <> · last gain {formatTotalGain(loopLastImprovementPct)}</>
              )}
            </>
          )}
        </Alert>
      )}
      {!isLoopRunning && loopOutcome?.kind === "error" && (
        <Alert tone="danger">{formatOutcomeLine(loopOutcome)}</Alert>
      )}
      {solverError && <Alert tone="danger">{solverError}</Alert>}

      <Block tag={solved ? "optimized" : "current"} title="score">
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <ScoreCol
            current={notateNumber(buildRate)}
            diff={
              solved && score ? formatDiff(score.buildRate, buildRate) : null
            }
            label="build-rate"
          />
          <ScoreCol
            current={formatPercent(expBonus)}
            diff={
              solved && score
                ? formatPercentDiff(score.expBonus, expBonus)
                : null
            }
            label="exp-bonus"
          />
          <ScoreCol
            current={notateNumber(flaggy)}
            diff={solved && score ? formatDiff(score.flaggy, flaggy) : null}
            label="flaggy"
          />
        </div>
        <div className="mt-2 flex items-center gap-2 font-mono text-[10px]">
          <span className="text-text-muted uppercase tracking-[1px]">
            exp-rate/hr
          </span>
          <span className="text-foreground">{notateNumber(playerExpRate)}</span>
          {playerExpRateDiff && (
            <span
              className={
                playerExpRateDiff.startsWith("-")
                  ? "text-destructive"
                  : "text-success"
              }
            >
              {playerExpRateDiff}
            </span>
          )}
        </div>
      </Block>

      <Block
        note="solver runs locally for up to 10 minutes. after solving, click apply to execute the move list."
        tag="planner"
        title="construction.solver"
      >
        <div className="flex items-end gap-2.5">
          <Field label="focus" width="w-[160px]">
            <TermSelect
              onChange={(v) => setConstruction({ focus: v as SolverFocus })}
              options={activeFocusOptions}
              value={focus}
            />
          </Field>
          <DisabledHint
            disabled={!isSignedIn || dataIsStale}
            popover={isSignedIn ? stalenessHint : solverHint}
          >
            <button
              className="cursor-pointer rounded-[3px] border border-amber bg-surface px-3.5 py-1.5 font-mono font-semibold text-[11px] text-amber hover:bg-surface-hi disabled:cursor-default disabled:opacity-60"
              disabled={
                !(isSignedIn && constructionData) ||
                isSolverActive ||
                isLoopRunning ||
                dataIsStale
              }
              onClick={handleSolve}
              type="button"
            >
              {isSolverActive ? "↻ solving…" : "↻ solve"}
            </button>
          </DisabledHint>
          {isSolverActive && (
            <button
              className="cursor-pointer rounded-[3px] border border-amber bg-surface px-3.5 py-1.5 font-mono font-semibold text-[11px] text-amber hover:bg-surface-hi disabled:cursor-default disabled:opacity-60"
              disabled={isCancelling || isLoopRunning}
              onClick={handleCancel}
              type="button"
            >
              {isCancelling ? "↻ cancelling…" : "↻ cancel"}
            </button>
          )}
          <DisabledHint
            disabled={!isSignedIn || (loopStatus === "idle" && dataIsStale)}
            popover={
              isSignedIn
                ? loopStatus === "idle" && dataIsStale
                  ? stalenessHint
                  : null
                : solverHint
            }
          >
            <button
              className="cursor-pointer rounded-[3px] border border-amber bg-surface px-3.5 py-1.5 font-mono font-semibold text-[11px] text-amber hover:bg-surface-hi disabled:cursor-default disabled:opacity-60"
              disabled={
                loopStatus === "cancelling" ||
                (loopStatus === "idle" &&
                  (!(isSignedIn && constructionData) ||
                    isSolverActive ||
                    queueHasOtherWork ||
                    dataIsStale))
              }
              onClick={() => {
                if (loopStatus === "running") {
                  stopLoop().catch(() => undefined);
                  return;
                }
                clearLoopOutcome();
                startLoop(focus).catch(() => undefined);
              }}
              type="button"
            >
              {loopStatus === "running"
                ? "↻ stop loop"
                : loopStatus === "cancelling"
                  ? "↻ stopping…"
                  : "↻ loop solve"}
            </button>
          </DisabledHint>
          {solverResult && solverResult.steps.length > 0 && (
            <DisabledHint
              disabled={!isSignedIn || dataIsStale}
              popover={isSignedIn ? stalenessHint : solverHint}
            >
              <RunBtn
                disabled={!isSignedIn || isLoopRunning || dataIsStale}
                getArgs={() => [solverResult.steps]}
                label="apply board"
                scriptId="world3.construction.apply"
                small
              />
            </DisabledHint>
          )}
        </div>
        {isSolverActive && progress && (
          <div className="mt-2.5 rounded-[3px] border border-border-soft bg-panel-2 p-2 font-mono text-[10px] text-text-dim leading-[1.7]">
            <div className="flex items-center gap-4">
              <span
                className={
                  progress.improvementPct > 0 ? "text-amber" : "text-text-dim"
                }
              >
                best {formatImprovement(progress.improvementPct)}
              </span>
              <span>{notateNumber(progress.iter)} iter</span>
              <span>{notateNumber(progress.iterPerSec)}/s</span>
              <span>{formatElapsed(progress.elapsedMs)}</span>
              <span>
                {progress.restarts} restart{progress.restarts === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        )}
        {isLoopRunning && (
          <div className="mt-2.5 rounded-[3px] border border-border-soft bg-panel-2 p-2 font-mono text-[10px] text-text-dim leading-[1.7]">
            <div className="flex items-center gap-4">
              <span className="text-amber">iteration {loopIteration}/10</span>
              {progress && (
                <>
                  <span
                    className={
                      progress.improvementPct > 0
                        ? "text-amber"
                        : "text-text-dim"
                    }
                  >
                    best {formatImprovement(progress.improvementPct)}
                  </span>
                  <span>{notateNumber(progress.iter)} iter</span>
                  <span>{notateNumber(progress.iterPerSec)}/s</span>
                  <span>{formatElapsed(progress.elapsedMs)}</span>
                  <span>
                    {progress.restarts} restart
                    {progress.restarts === 1 ? "" : "s"}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        {solverResult && solverResult.steps.length > 0 && (
          <div className="mt-2.5 max-h-20 overflow-auto rounded-[3px] border border-border-soft bg-panel-2 p-2 font-mono text-[10px] text-text-dim leading-[1.7]">
            {solverResult.steps.map((step, index) => {
              const key = `${step.from.location}-${step.from.x}-${step.from.y}->${step.to.location}-${step.to.x}-${step.to.y}-${index}`;
              return (
                <div key={key}>
                  step {index + 1}: swap {formatLocation(step.from)} ↔{" "}
                  {formatLocation(step.to)}
                </div>
              );
            })}
          </div>
        )}
        {solverResult &&
          solverResult.steps.length === 0 &&
          !isSolverActive &&
          !isLoopRunning && (
            <div className="mt-2.5 rounded-[3px] border border-border-soft bg-panel-2 p-2 font-mono text-[10px] text-text-dim leading-[1.7]">
              no better board found - score holds at build-rate{" "}
              {notateNumber(solverResult.score.buildRate)} / exp-bonus{" "}
              {formatPercent(solverResult.score.expBonus)} / flaggy{" "}
              {notateNumber(solverResult.score.flaggy)}
            </div>
          )}
        {!isLoopRunning && loopOutcome && loopOutcome.kind !== "error" && (
          <div className="mt-2.5 rounded-[3px] border border-border-soft bg-panel-2 p-2 font-mono text-[10px] text-text-dim leading-[1.7]">
            {formatOutcomeLine(loopOutcome)}
            {loopStartScore &&
              (loopOutcome.kind === "completed-no-improvement" ||
                loopOutcome.kind === "completed-cap") && (
                <>
                  {" "}
                  ({SCORE_FIELD_LABEL[focus]}{" "}
                  {notateNumber(loopStartScore[SCORE_FIELD[focus]])}
                  {" → "}
                  {(() => {
                    const finalVal = Math.round(
                      loopStartScore[SCORE_FIELD[focus]] *
                        (1 + loopOutcome.totalGainPct / 100)
                    );
                    return notateNumber(finalVal);
                  })()})
                </>
              )}
          </div>
        )}
      </Block>

      <div className="grid grid-cols-2 gap-1.5">
        <Block
          note="collects every available cog on the bench."
          title="cogs.collect"
        >
          <BlockActions>
            <RunBtn
              label="collect cogs"
              scriptId="world3.construction.collectCogs"
              small
            />
          </BlockActions>
        </Block>
        <Block
          note="bulk-trashes cogs on the bench below your kept-quality threshold."
          title="cogs.trash"
        >
          <BlockActions>
            <RunBtn
              label="trash cogs"
              scriptId="world3.construction.trashCogs"
              small
            />
          </BlockActions>
        </Block>
      </div>
    </>
  );
};

export default Construction;
