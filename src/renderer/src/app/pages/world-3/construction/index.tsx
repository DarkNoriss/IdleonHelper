import { useEffect, useState } from "react";
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
import { useMainState } from "@/hooks/use-main-state";
import { notateNumber } from "@/lib/notateNumber.ts";
import { useGameData } from "@/providers/game-data-provider.tsx";
import { useRawJsonStore } from "@/store/raw-json.ts";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";
import type {
  OptimalStep,
  SolverFocus,
  SolverResult,
  SolverWeights,
} from "@/types/construction.ts";

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

const Construction = () => {
  const parsedJson = useRawJsonStore((state) => state.parsedJson);
  const { construction: constructionData } = useGameData();
  const focus = useUiPrefsStore((s) => s.construction.focus);
  const setConstruction = useUiPrefsStore((s) => s.setConstruction);
  const [isSolving, setIsSolving] = useState(false);
  const [solverResult, setSolverResult] = useState<SolverResult | null>(null);
  const [solverError, setSolverError] = useState<string | null>(null);
  const solverState = useMainState("constructionSolver");
  const progress = solverState?.progress ?? null;
  const [isCancelling, setIsCancelling] = useState(false);
  const isSolverActive = isSolving || progress !== null;
  const score = constructionData?.score;

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

  const handleSolve = async () => {
    if (!constructionData) {
      setSolverError("No construction data available");
      return;
    }
    setSolverError(null);
    setSolverResult(null);
    setIsSolving(true);
    try {
      const weights: SolverWeights = { focus, flaggy: 0 };
      const solveTimeMs = DEFAULT_SOLVE_TIME_SECONDS * 1000;
      const result = await window.api.script.world3.construction.solver(
        constructionData,
        weights,
        solveTimeMs
      );
      if (result) {
        setSolverResult(result);
      }
    } catch (err) {
      setSolverError(
        err instanceof Error ? err.message : "Failed to solve construction"
      );
    } finally {
      setIsSolving(false);
      setIsCancelling(false);
    }
  };

  const handleCancel = async () => {
    if (!isSolverActive || isCancelling) {
      return;
    }
    setIsCancelling(true);
    try {
      await window.api.script.world3.construction.solverCancel();
    } catch (err) {
      setSolverError(
        err instanceof Error ? err.message : "Failed to cancel solver"
      );
      setIsCancelling(false);
    }
  };

  const solved = solverResult !== null;
  const buildRate = solverResult?.score.buildRate ?? score?.buildRate ?? 0;
  const expBonus = solverResult?.score.expBonus ?? score?.expBonus ?? 0;
  const flaggy = solverResult?.score.flaggy ?? score?.flaggy ?? 0;

  return (
    <>
      <PageHead
        description="Solves for the optimal cog placement given your current cogs, then applies the layout. Also collects or trashes cogs in bulk."
        path="world-3 / construction"
        title="construction"
      />
      <Alert tone="warn">
        navigate to the construction screen in-game. save raw-data first or the
        solver won't have a board to work with.
      </Alert>
      {!parsedJson && (
        <Alert tone="info">
          no raw-data yet — open the raw-data page and paste your JSON.
        </Alert>
      )}
      {solverError && <Alert tone="danger">{solverError}</Alert>}

      {score && (
        <Block compact tag={solved ? "optimized" : "current"} title="score">
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <ScoreCol
              current={notateNumber(buildRate)}
              diff={
                solved && score ? formatDiff(score.buildRate, buildRate) : null
              }
              label="build-rate"
            />
            <ScoreCol
              current={`${notateNumber(expBonus)}%`}
              diff={
                solved && score ? formatDiff(score.expBonus, expBonus) : null
              }
              label="exp-bonus"
            />
            <ScoreCol
              current={notateNumber(flaggy)}
              diff={solved && score ? formatDiff(score.flaggy, flaggy) : null}
              label="flaggy"
            />
          </div>
        </Block>
      )}

      <Block
        compact
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
          <button
            className="cursor-pointer rounded-[3px] border border-amber bg-surface px-3.5 py-1.5 font-mono font-semibold text-[11px] text-amber hover:bg-surface-hi disabled:cursor-default disabled:opacity-60"
            disabled={!constructionData || isSolverActive}
            onClick={handleSolve}
            type="button"
          >
            {isSolverActive ? "↻ solving…" : "↻ solve"}
          </button>
          {isSolverActive && (
            <button
              className="cursor-pointer rounded-[3px] border border-amber bg-surface px-3.5 py-1.5 font-mono font-semibold text-[11px] text-amber hover:bg-surface-hi disabled:cursor-default disabled:opacity-60"
              disabled={isCancelling}
              onClick={handleCancel}
              type="button"
            >
              {isCancelling ? "↻ cancelling…" : "↻ cancel"}
            </button>
          )}
          <RunBtn
            disabled={!solverResult}
            getArgs={() => [solverResult?.steps ?? []]}
            label="apply board"
            scriptId="world3.construction.apply"
            small
          />
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
      </Block>

      <div className="grid grid-cols-2 gap-1.5">
        <Block
          compact
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
          compact
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
