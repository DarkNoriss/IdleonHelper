import { useMemo, useState } from "react";
import {
  type OptimizerCostItem,
  OptimizerCostSummary,
} from "@/components/optimizer/optimizer-cost-summary";
import { OptimizerResourceChips } from "@/components/optimizer/optimizer-resource-chips";
import {
  OptimizerRphDialog,
  type RphRates,
  type RphResource,
} from "@/components/optimizer/optimizer-rph-dialog";
import { OptimizerTable } from "@/components/optimizer/optimizer-table";
import { OptimizerToolbar } from "@/components/optimizer/optimizer-toolbar";
import { RunBtn } from "@/components/terminal";
import { DisabledHint } from "@/components/terminal/disabled-hint";
import { useUpgraderFreshnessGate } from "@/hooks/use-upgrader-freshness-gate";
import { notateNumber } from "@/lib/notateNumber";
import {
  computeCompassPath,
  DUST_RESOURCE_IDS,
} from "@/parsers/compass-optimizer";
import {
  groupSteps,
  toUpgraderSteps,
  withFromLevels,
} from "@/parsers/optimizer-core";
import { useGameData } from "@/providers/game-data-provider";
import { useUiPrefsStore } from "@/store/ui-prefs";
import type { CompassCategory, CompassRphRates } from "@/types/compass";

const UPGRADER_SCRIPT_ID = "classSpecific.compass.run";

const CATEGORY_OPTIONS: readonly { id: CompassCategory; label: string }[] = [
  { id: "all", label: "all (cheapest)" },
  { id: "damage", label: "damage" },
  { id: "dust", label: "dust" },
  { id: "accuracy", label: "accuracy" },
  { id: "defence", label: "defence" },
  { id: "crit", label: "crit" },
  { id: "attackSpeed", label: "attack speed" },
  { id: "hp", label: "hp" },
];

const MAX_STEPS_OPTIONS = [10, 25, 50, 100, 300] as const;

const DUST_LABELS: Record<string, string> = {
  stardust: "stardust",
  moondust: "moondust",
  solardust: "solardust",
  cooldust: "cooldust",
  novadust: "novadust",
};

const RPH_RESOURCES: readonly RphResource[] = DUST_RESOURCE_IDS.map((id) => ({
  id,
  label: DUST_LABELS[id] ?? id,
}));

const DUST_FILTER_OPTIONS: readonly { id: string; label: string }[] = [
  { id: "0", label: "stardust" },
  { id: "1", label: "moondust" },
  { id: "2", label: "solardust" },
  { id: "3", label: "cooldust" },
  { id: "4", label: "novadust" },
];

// Convert the prefs `disabledDusts: number[]` into the multi-select's
// "selected ids" view (the indices NOT disabled), preserving option order.
function selectedIdsFromDisabled(
  disabled: readonly number[]
): readonly string[] {
  const set = new Set(disabled);
  return DUST_FILTER_OPTIONS.filter((o) => !set.has(Number(o.id))).map(
    (o) => o.id
  );
}

// Convert the multi-select's "selected ids" back into a sorted-ascending
// `disabledDusts` list.
function disabledFromSelectedIds(ids: readonly string[]): number[] {
  const checked = new Set(ids);
  return DUST_FILTER_OPTIONS.filter((o) => !checked.has(o.id))
    .map((o) => Number(o.id))
    .sort((a, b) => a - b);
}

const DEFAULT_RPH = 1;

function rphToStringKeyed(rph: CompassRphRates): RphRates {
  return {
    stardust: rph[0],
    moondust: rph[1],
    solardust: rph[2],
    cooldust: rph[3],
    novadust: rph[4],
  };
}

function stringKeyedToRph(rates: RphRates): CompassRphRates {
  return {
    0: rates.stardust ?? DEFAULT_RPH,
    1: rates.moondust ?? DEFAULT_RPH,
    2: rates.solardust ?? DEFAULT_RPH,
    3: rates.cooldust ?? DEFAULT_RPH,
    4: rates.novadust ?? DEFAULT_RPH,
  };
}

function isRphDirty(rph: CompassRphRates): boolean {
  return (
    rph[0] !== DEFAULT_RPH ||
    rph[1] !== DEFAULT_RPH ||
    rph[2] !== DEFAULT_RPH ||
    rph[3] !== DEFAULT_RPH ||
    rph[4] !== DEFAULT_RPH
  );
}

export const CompassOptimizerTab = () => {
  const { compass } = useGameData();
  const prefs = useUiPrefsStore((s) => s.compassOptimizer);
  const setPrefs = useUiPrefsStore((s) => s.setCompassOptimizer);
  const lastRunAt = useUiPrefsStore((s) => s.compassUpgraderRun.lastRunAt);
  const setUpgraderRun = useUiPrefsStore((s) => s.setCompassUpgraderRun);

  const { dataIsStale } = useUpgraderFreshnessGate({
    scriptId: UPGRADER_SCRIPT_ID,
    lastRunAt,
    setLastRunAt: (ms) => setUpgraderRun({ lastRunAt: ms }),
  });

  const [rphOpen, setRphOpen] = useState(false);

  const isMetric = prefs.category !== "all";

  const steps = useMemo(() => {
    if (!compass) {
      return [];
    }
    return computeCompassPath({
      data: compass,
      category: prefs.category,
      // Compass always scores by time-to-afford; with rph defaulting to 1
      // this collapses to plain-cost behavior, so a separate cost/perHour
      // toggle would just confuse users. The set-rph dialog is the only
      // control needed.
      scoreMode: "perHour",
      rph: prefs.rph,
      disabledDusts: prefs.disabledDusts ?? [],
      maxSteps: prefs.maxSteps,
      groupMode: prefs.groupMode,
      onlyAffordable: prefs.onlyAffordable,
    });
  }, [compass, prefs]);

  const rows = useMemo(
    () => groupSteps(steps, prefs.groupMode, isMetric),
    [steps, prefs.groupMode, isMetric]
  );

  const upgraderSteps = useMemo(
    () =>
      withFromLevels(
        toUpgraderSteps(steps, prefs.groupMode, isMetric),
        compass?.upgradeLevels ?? []
      ),
    [steps, prefs.groupMode, isMetric, compass?.upgradeLevels]
  );

  const costItems = useMemo<OptimizerCostItem[]>(() => {
    if (!compass) {
      return [];
    }
    const byId = new Map<string, number>();
    for (const r of rows) {
      byId.set(r.resourceId, (byId.get(r.resourceId) ?? 0) + r.cost);
    }
    return DUST_RESOURCE_IDS.map((id, i) => ({
      id,
      label: DUST_LABELS[id] ?? id,
      totalCost: byId.get(id) ?? 0,
      currentHave: compass.dusts[i] ?? 0,
      rph: prefs.rph[i as 0 | 1 | 2 | 3 | 4] ?? 1,
    })).filter((item) => item.totalCost > 0);
  }, [compass, rows, prefs.rph]);

  if (!compass) {
    return (
      <div className="rounded-[5px] border border-border bg-panel p-4 text-center font-mono text-[11px] text-text-dim">
        no compass data — load your save first via the cloudsave page
      </div>
    );
  }

  const inventory = DUST_RESOURCE_IDS.map((id, i) => ({
    id,
    label: DUST_LABELS[id] ?? id,
    value: compass.dusts[i] ?? 0,
  }));

  const dailyDiscounts = compass.hasLegendTalent
    ? {
        remaining: compass.dailyDiscountsRemaining,
        max: compass.dailyDiscountsMax,
      }
    : undefined;

  return (
    <div className="flex flex-col">
      <OptimizerResourceChips
        dailyDiscounts={dailyDiscounts}
        inventory={inventory}
      />
      <div className="mb-2.5 rounded-[5px] border border-border bg-panel p-2.5">
        <OptimizerToolbar
          categories={CATEGORY_OPTIONS}
          category={prefs.category}
          className="mb-0"
          customMaxSteps={prefs.customMaxSteps}
          groupMode={prefs.groupMode}
          maxSteps={prefs.maxSteps}
          maxStepsOptions={MAX_STEPS_OPTIONS}
          onCategoryChange={(c) => setPrefs({ category: c as CompassCategory })}
          onCustomMaxStepsChange={(n) => setPrefs({ customMaxSteps: n })}
          onGroupModeChange={(m) => setPrefs({ groupMode: m })}
          onlyAffordable={prefs.onlyAffordable}
          onMaxStepsChange={(n) => setPrefs({ maxSteps: n })}
          onOnlyAffordableChange={(b) => setPrefs({ onlyAffordable: b })}
          onOpenRphDialog={() => setRphOpen(true)}
          onResourceFilterChange={(ids) =>
            setPrefs({ disabledDusts: disabledFromSelectedIds(ids) })
          }
          resourceFilterAllLabel="all dusts"
          resourceFilterLabel="resources"
          resourceFilterOptions={DUST_FILTER_OPTIONS}
          resourceFilterValues={selectedIdsFromDisabled(
            prefs.disabledDusts ?? []
          )}
          rightSlot={(() => {
            const upgraderDisabled =
              !prefs.onlyAffordable ||
              upgraderSteps.length === 0 ||
              dataIsStale;
            const upgraderHint = dataIsStale
              ? "waiting for upgrade levels to update - idleon hasn't synced post-run state yet"
              : prefs.onlyAffordable
                ? upgraderSteps.length === 0
                  ? "no affordable upgrades found - tweak the optimizer or earn more dust"
                  : null
                : "enable 'show only affordable' to use the upgrader";
            const button = (
              <RunBtn
                disabled={upgraderDisabled}
                getArgs={() => [upgraderSteps]}
                label="run upgrader"
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
          rphDirty={isRphDirty(prefs.rph)}
          upgradeCount={rows.reduce((sum, r) => sum + r.count, 0)}
        />
      </div>
      <OptimizerCostSummary items={costItems} />
      <OptimizerTable
        formatCost={notateNumber}
        formatGain={(gain) => `+${gain.toFixed(2)}%`}
        isMetric={isMetric}
        rows={rows}
      />
      <OptimizerRphDialog
        onOpenChange={setRphOpen}
        onSave={(rates) => setPrefs({ rph: stringKeyedToRph(rates) })}
        open={rphOpen}
        rates={rphToStringKeyed(prefs.rph)}
        resources={RPH_RESOURCES}
      />
    </div>
  );
};
