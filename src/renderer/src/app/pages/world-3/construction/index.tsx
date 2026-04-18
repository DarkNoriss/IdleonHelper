import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { ScriptPage } from "@/components/script-page.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
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

const getSparePage = (y: number): number => {
  return Math.floor(y / SPARE_ROWS) + 1;
};

const formatLocation = (
  location: OptimalStep["from"] | OptimalStep["to"]
): string => {
  const x = location.x + 1;
  const y = location.y + 1;
  const locationType = location.location;

  if (location.location === "spare") {
    const page = getSparePage(location.y);
    return `spare [${x}|${y}] page ${page}`;
  }
  return `${locationType} [${x}|${y}]`;
};

const Construction = () => {
  const parsedJson = useRawJsonStore((state) => state.parsedJson);
  const { construction: constructionData } = useGameData();
  const focus = useUiPrefsStore((s) => s.construction.focus);
  const setConstruction = useUiPrefsStore((s) => s.setConstruction);
  const [isSolving, setIsSolving] = useState(false);
  const [solverResult, setSolverResult] = useState<SolverResult | null>(null);
  const [solverError, setSolverError] = useState<string | null>(null);
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

  useEffect(() => {
    setSolverResult(null);
  }, []);

  const getDifference = (current: number, optimized: number) => {
    return optimized - current;
  };

  const buildRateDiff =
    score && solverResult
      ? getDifference(score.buildRate, solverResult.score.buildRate)
      : null;
  const expBonusDiff =
    score && solverResult
      ? getDifference(score.expBonus, solverResult.score.expBonus)
      : null;
  const flaggyDiff =
    score && solverResult
      ? getDifference(score.flaggy, solverResult.score.flaggy)
      : null;

  const handleSolve = async () => {
    if (!constructionData) {
      setSolverError("No construction data available");
      return;
    }

    setSolverError(null);
    setSolverResult(null);
    setIsSolving(true);

    try {
      const weights: SolverWeights = {
        focus,
        flaggy: 0,
      };

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
    }
  };

  return (
    <ScriptPage
      actions={[
        {
          label: "Apply Optimized Board",
          scriptId: "world3.construction.apply",
          runningLabel: "Applying... (Click to stop)",
          args: () => [solverResult?.steps ?? []],
        },
        {
          label: "Collect Cogs",
          scriptId: "world3.construction.collectCogs",
          runningLabel: "Collecting... (Click to stop)",
        },
        {
          label: "Trash Cogs",
          scriptId: "world3.construction.trashCogs",
          runningLabel: "Trashing... (Click to stop)",
        },
      ]}
      title="Construction"
    >
      <div className="mb-4 flex flex-col gap-4">
        <div className="text-center text-muted-foreground text-sm">
          Navigate to the construction screen. Make sure to save your data on
          the Raw Data page first.
        </div>

        {!parsedJson && (
          <div className="rounded-md bg-accent/10 p-3 text-accent-foreground text-sm">
            No data available. Please go to the Raw Data page and save your JSON
            data first.
          </div>
        )}

        {solverError && (
          <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {solverError}
          </div>
        )}

        {score && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-center">
                {solverResult ? "Optimized Score" : "Current Score"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="font-bold text-2xl">
                    {notateNumber(
                      solverResult
                        ? solverResult.score.buildRate
                        : score.buildRate
                    )}
                  </div>
                  {buildRateDiff && (
                    <div
                      className={`mt-1 font-medium text-sm ${
                        buildRateDiff >= 0 ? "text-chart-1" : "text-destructive"
                      }`}
                    >
                      {notateNumber(buildRateDiff)}
                    </div>
                  )}
                  <div className="mt-1 text-muted-foreground text-sm">
                    Build Rate
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-2xl">
                    {notateNumber(
                      solverResult
                        ? solverResult.score.expBonus
                        : score.expBonus
                    )}
                  </div>
                  {expBonusDiff && (
                    <div
                      className={`mt-1 font-medium text-sm ${
                        expBonusDiff >= 0 ? "text-chart-1" : "text-destructive"
                      }`}
                    >
                      {notateNumber(expBonusDiff)}
                    </div>
                  )}
                  <div className="mt-1 text-muted-foreground text-sm">
                    Exp Bonus
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-2xl">
                    {notateNumber(
                      solverResult ? solverResult.score.flaggy : score.flaggy
                    )}
                  </div>
                  {flaggyDiff && (
                    <div
                      className={`mt-1 font-medium text-sm ${
                        flaggyDiff >= 0 ? "text-chart-1" : "text-destructive"
                      }`}
                    >
                      {notateNumber(flaggyDiff)}
                    </div>
                  )}
                  <div className="mt-1 text-muted-foreground text-sm">
                    Flaggy
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex w-full items-end gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <label className="font-medium text-sm" htmlFor="focus-select">
              Focus
            </label>
            <Select
              onValueChange={(value) =>
                setConstruction({ focus: value as SolverFocus })
              }
              value={focus}
            >
              <SelectTrigger id="focus-select">
                <SelectValue placeholder="Select focus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exp">Exp</SelectItem>
                <SelectItem value="buildRate">Build Rate</SelectItem>
                <SelectItem disabled={allSlotsUnlocked} value="flaggy">
                  Flaggy
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="min-w-48"
            disabled={!constructionData || isSolving}
            onClick={handleSolve}
            size="lg"
          >
            {isSolving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Solving...
              </>
            ) : (
              "Solve Construction"
            )}
          </Button>
        </div>

        {solverResult && solverResult.steps.length > 0 && (
          <div className="w-full">
            <div className="mb-2 text-center font-medium text-sm">
              Steps ({solverResult.steps.length})
            </div>
            <ScrollArea className="h-64 rounded-md border">
              <div className="space-y-2 p-3">
                {solverResult.steps.map((step, index) => (
                  <div className="text-sm" key={index}>
                    Step {index + 1}: Switch {formatLocation(step.from)} with{" "}
                    {formatLocation(step.to)}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </ScriptPage>
  );
};

export default Construction;
