import { useMemo } from "react";
import { OptimizerTable } from "@/components/optimizer/optimizer-table";
import { OptimizerToolbar } from "@/components/optimizer/optimizer-toolbar";
import { RunBtn, TermCheckbox } from "@/components/terminal";
import { DisabledHint } from "@/components/terminal/disabled-hint";
import { useUpgraderFreshnessGate } from "@/hooks/use-upgrader-freshness-gate";
import { notateNumber } from "@/lib/notateNumber";
import {
  groupSteps,
  toUpgraderSteps,
  withFromLevels,
} from "@/parsers/optimizer-core";
import {
  computeOrangeFireSum,
  computeUniqueSushi,
  fireplaceEffectBase,
  fuelCapacity,
  fuelGenPerHr,
  knowledgeBonusTotals,
  totalBucksPerHr,
} from "@/parsers/sushi-station-formulas";
import { computeSushiPath } from "@/parsers/sushi-station-optimizer";
import { useGameData } from "@/providers/game-data-provider";
import { useUiPrefsStore } from "@/store/ui-prefs";
import {
  OPTIMIZER_MAX_STEPS_OPTIONS,
  type OptimizerCategory,
} from "@/types/sushi-station";

const UPGRADER_SCRIPT_ID = "world7.sushiStation.sushiUpgrader";

const CATEGORY_OPTIONS: readonly { id: OptimizerCategory; label: string }[] = [
  { id: "all", label: "all (cheapest)" },
  { id: "bucks", label: "bucks/hr" },
  { id: "fuelRate", label: "fuel/hr" },
  { id: "fuelCap", label: "fuel cap" },
];

type StatTone = "amber";

const StatCell = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: StatTone;
}) => (
  <div className="flex items-baseline gap-2 border-border-soft border-r px-3 py-1.5 last:border-r-0">
    <span className="text-[9px] text-text-muted uppercase tracking-[0.4px]">
      {label}
    </span>
    <span
      className={`ml-auto font-medium ${tone === "amber" ? "text-amber" : "text-foreground"}`}
    >
      {value}
    </span>
  </div>
);

export const UpgradeOptimizer = () => {
  const { sushiStation } = useGameData();
  const prefs = useUiPrefsStore((s) => s.sushiOptimizer);
  const setPrefs = useUiPrefsStore((s) => s.setSushiOptimizer);
  const lastRunAt = useUiPrefsStore((s) => s.sushiUpgraderRun.lastRunAt);
  const setUpgraderRun = useUiPrefsStore((s) => s.setSushiUpgraderRun);

  const { dataIsStale } = useUpgraderFreshnessGate({
    scriptId: UPGRADER_SCRIPT_ID,
    lastRunAt,
    setLastRunAt: (ms) => setUpgraderRun({ lastRunAt: ms }),
  });

  const isMetric = prefs.category !== "all";

  const steps = useMemo(() => {
    if (!sushiStation) {
      return [];
    }
    return computeSushiPath({
      data: sushiStation,
      category: prefs.category,
      maxSteps: prefs.maxSteps,
      onlyAffordable: prefs.onlyAffordable,
    });
  }, [sushiStation, prefs]);

  const rows = useMemo(
    () => groupSteps(steps, prefs.groupMode, isMetric),
    [steps, prefs.groupMode, isMetric]
  );

  const upgraderSteps = useMemo(
    () =>
      withFromLevels(
        toUpgraderSteps(steps, prefs.groupMode, isMetric),
        sushiStation?.upgradeLevels ?? []
      ),
    [steps, prefs.groupMode, isMetric, sushiStation?.upgradeLevels]
  );

  const stats = useMemo(() => {
    if (!sushiStation) {
      return null;
    }
    const knowledgeTotals = knowledgeBonusTotals(sushiStation.rawSushiData);
    const uniqueSushi = computeUniqueSushi(sushiStation.rawSushiData);
    const fireplaceBase = fireplaceEffectBase(
      knowledgeTotals,
      sushiStation.sparks
    );
    const orangeFire = computeOrangeFireSum(
      sushiStation.rawSushiData,
      fireplaceBase
    );
    return {
      bucksPerHr: totalBucksPerHr(
        sushiStation.rawSushiData,
        sushiStation.upgradeLevels,
        uniqueSushi,
        knowledgeTotals,
        sushiStation.externalSources
      ),
      fuelMax: fuelCapacity(
        sushiStation.upgradeLevels,
        knowledgeTotals,
        sushiStation.hasBundleV
      ),
      fuelGen: fuelGenPerHr(
        sushiStation.upgradeLevels,
        sushiStation.rawSushiData,
        knowledgeTotals,
        orangeFire,
        sushiStation.hasBundleV
      ),
    };
  }, [sushiStation]);

  if (!(sushiStation && stats)) {
    return (
      <div className="rounded-[5px] border border-border bg-panel p-4 text-center font-mono text-[11px] text-text-dim">
        no sushi station data — load your save first via the cloudsave page
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="mb-3 grid grid-cols-5 overflow-hidden rounded-[4px] border border-border bg-panel font-mono text-[10.5px]">
        <StatCell
          label="bucks"
          tone="amber"
          value={notateNumber(sushiStation.bucks)}
        />
        <StatCell label="bucks/hr" value={notateNumber(stats.bucksPerHr)} />
        <StatCell
          label="fuel"
          value={`${notateNumber(sushiStation.fuelCurrent)} / ${notateNumber(stats.fuelMax)}`}
        />
        <StatCell label="fuel/hr" value={notateNumber(stats.fuelGen)} />
        <StatCell label="research" value={String(sushiStation.researchLevel)} />
      </div>
      <div className="mb-2.5 rounded-[5px] border border-border bg-panel p-2.5">
        <OptimizerToolbar
          categories={CATEGORY_OPTIONS}
          category={prefs.category}
          className="mb-0"
          groupMode={prefs.groupMode}
          maxSteps={prefs.maxSteps}
          maxStepsOptions={OPTIMIZER_MAX_STEPS_OPTIONS}
          onCategoryChange={(c) =>
            setPrefs({ category: c as OptimizerCategory })
          }
          onGroupModeChange={(m) => setPrefs({ groupMode: m })}
          onlyAffordable={prefs.onlyAffordable}
          onMaxStepsChange={(n) => setPrefs({ maxSteps: n })}
          onOnlyAffordableChange={(b) => setPrefs({ onlyAffordable: b })}
          rightSlot={(() => {
            const upgraderDisabled =
              !prefs.onlyAffordable ||
              upgraderSteps.length === 0 ||
              dataIsStale;
            const upgraderHint = dataIsStale
              ? "waiting for upgrade levels to update - idleon hasn't synced post-run state yet"
              : prefs.onlyAffordable
                ? upgraderSteps.length === 0
                  ? "no affordable upgrades found - tweak the optimizer or earn more bucks"
                  : null
                : "enable 'show only affordable' to use the upgrader";
            const button = (
              <RunBtn
                disabled={upgraderDisabled}
                getArgs={() => [upgraderSteps, prefs.dryRun]}
                label={prefs.dryRun ? "dry-run upgrader" : "run upgrader"}
                scriptId={UPGRADER_SCRIPT_ID}
                small
              />
            );
            return upgraderHint ? (
              <DisabledHint disabled popover={upgraderHint}>
                {button}
              </DisabledHint>
            ) : (
              button
            );
          })()}
          upgradeCount={rows.reduce((sum, r) => sum + r.count, 0)}
        />
        <div className="mt-2.5">
          <TermCheckbox
            checked={prefs.dryRun}
            label="dry-run (capture screenshot, skip click)"
            onChange={(v) => setPrefs({ dryRun: v })}
          />
        </div>
      </div>
      <OptimizerTable
        formatCost={notateNumber}
        formatGain={notateNumber}
        isMetric={isMetric}
        rows={rows}
      />
    </div>
  );
};
