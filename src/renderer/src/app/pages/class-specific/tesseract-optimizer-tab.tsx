import { useMemo, useState } from "react";
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
  groupSteps,
  toUpgraderSteps,
  withFromLevels,
} from "@/parsers/optimizer-core";
import { TESSERACT_UPGRADE_DEFS } from "@/parsers/tesseract-data";
import {
  computeTesseractPath,
  TACHYON_RESOURCE_IDS,
} from "@/parsers/tesseract-optimizer";
import { useGameData } from "@/providers/game-data-provider";
import { useUiPrefsStore } from "@/store/ui-prefs";
import type {
  TesseractCategory,
  TesseractRphRates,
  TesseractTachyonFilter,
} from "@/types/tesseract";

const UPGRADER_SCRIPT_ID = "classSpecific.tesseract.runUpgrader";

const CATEGORY_OPTIONS: readonly { id: TesseractCategory; label: string }[] = [
  { id: "all", label: "all (cheapest)" },
  { id: "damage", label: "damage" },
  { id: "accuracy", label: "accuracy" },
  { id: "defence", label: "defence" },
  { id: "crit", label: "crit" },
  { id: "attackSpeed", label: "attack speed" },
  { id: "tachyons", label: "extra tachyons" },
];

const MAX_STEPS_OPTIONS = [10, 25, 50, 100, 300] as const;

const TACHYON_LABELS: Record<string, string> = {
  purple: "purple",
  brown: "brown",
  green: "green",
  red: "red",
  silver: "silver",
  gold: "gold",
};

const RPH_RESOURCES: readonly RphResource[] = TACHYON_RESOURCE_IDS.map(
  (id) => ({ id, label: TACHYON_LABELS[id] ?? id })
);

const TACHYON_FILTER_OPTIONS: readonly { id: string; label: string }[] = [
  { id: "all", label: "all tachyons" },
  { id: "0", label: "purple" },
  { id: "1", label: "brown" },
  { id: "2", label: "green" },
  { id: "3", label: "red" },
  { id: "4", label: "silver" },
  { id: "5", label: "gold" },
];

function tachyonFilterToId(f: TesseractTachyonFilter): string {
  return f === "all" ? "all" : String(f);
}

function idToTachyonFilter(id: string): TesseractTachyonFilter {
  if (id === "all") {
    return "all";
  }
  const n = Number(id);
  if (n === 0 || n === 1 || n === 2 || n === 3 || n === 4 || n === 5) {
    return n;
  }
  return "all";
}

const DEFAULT_RPH = 1;

function rphToStringKeyed(rph: TesseractRphRates): RphRates {
  return {
    purple: rph[0],
    brown: rph[1],
    green: rph[2],
    red: rph[3],
    silver: rph[4],
    gold: rph[5],
  };
}

function stringKeyedToRph(rates: RphRates): TesseractRphRates {
  return {
    0: rates.purple ?? DEFAULT_RPH,
    1: rates.brown ?? DEFAULT_RPH,
    2: rates.green ?? DEFAULT_RPH,
    3: rates.red ?? DEFAULT_RPH,
    4: rates.silver ?? DEFAULT_RPH,
    5: rates.gold ?? DEFAULT_RPH,
  };
}

function isRphDirty(rph: TesseractRphRates): boolean {
  return (
    rph[0] !== DEFAULT_RPH ||
    rph[1] !== DEFAULT_RPH ||
    rph[2] !== DEFAULT_RPH ||
    rph[3] !== DEFAULT_RPH ||
    rph[4] !== DEFAULT_RPH ||
    rph[5] !== DEFAULT_RPH
  );
}

export const TesseractOptimizerTab = () => {
  const { tesseract } = useGameData();
  const prefs = useUiPrefsStore((s) => s.tesseractOptimizer);
  const setPrefs = useUiPrefsStore((s) => s.setTesseractOptimizer);
  const lastRunAt = useUiPrefsStore((s) => s.tesseractUpgraderRun.lastRunAt);
  const setUpgraderRun = useUiPrefsStore((s) => s.setTesseractUpgraderRun);

  const { dataIsStale } = useUpgraderFreshnessGate({
    scriptId: UPGRADER_SCRIPT_ID,
    lastRunAt,
    setLastRunAt: (ms) => setUpgraderRun({ lastRunAt: ms }),
    getCurrentLevels: () => tesseract?.upgradeLevels ?? [],
    getPlannedSteps: () => upgraderSteps,
    upgradeNameOf: (i) => TESSERACT_UPGRADE_DEFS[i]?.name ?? "?",
    logPrefix: "tesseract-upgrader",
  });

  const [rphOpen, setRphOpen] = useState(false);

  const isMetric = prefs.category !== "all";

  const steps = useMemo(() => {
    if (!tesseract) {
      return [];
    }
    return computeTesseractPath({
      data: tesseract,
      category: prefs.category,
      // Always score by time-to-afford; with rph defaulting to 1 this
      // collapses to plain-cost behavior. Same rationale as compass.
      scoreMode: "perHour",
      rph: prefs.rph,
      tachyonFilter: prefs.tachyonFilter ?? "all",
      maxSteps: prefs.maxSteps,
      groupMode: prefs.groupMode,
      onlyAffordable: prefs.onlyAffordable,
    });
  }, [tesseract, prefs]);

  const rows = useMemo(
    () => groupSteps(steps, prefs.groupMode, isMetric),
    [steps, prefs.groupMode, isMetric]
  );

  const upgraderSteps = useMemo(
    () =>
      withFromLevels(
        toUpgraderSteps(steps, prefs.groupMode, isMetric),
        tesseract?.upgradeLevels ?? []
      ),
    [steps, prefs.groupMode, isMetric, tesseract?.upgradeLevels]
  );

  if (!tesseract) {
    return (
      <div className="rounded-[5px] border border-border bg-panel p-4 text-center font-mono text-[11px] text-text-dim">
        no tesseract data — load your save first via the cloudsave page
      </div>
    );
  }

  const inventory = TACHYON_RESOURCE_IDS.map((id, i) => ({
    id,
    label: TACHYON_LABELS[id] ?? id,
    value: tesseract.tachyons[i] ?? 0,
  }));

  const dailyDiscounts = tesseract.hasLegendTalent
    ? {
        remaining: tesseract.dailyDiscountsRemaining,
        max: tesseract.dailyDiscountsMax,
      }
    : undefined;

  return (
    <div className="flex flex-col">
      <OptimizerResourceChips
        dailyDiscounts={dailyDiscounts}
        inventory={inventory}
      />
      <OptimizerToolbar
        categories={CATEGORY_OPTIONS}
        category={prefs.category}
        groupMode={prefs.groupMode}
        maxSteps={prefs.maxSteps}
        maxStepsOptions={MAX_STEPS_OPTIONS}
        onCategoryChange={(c) => setPrefs({ category: c as TesseractCategory })}
        onGroupModeChange={(m) => setPrefs({ groupMode: m })}
        onlyAffordable={prefs.onlyAffordable}
        onMaxStepsChange={(n) => setPrefs({ maxSteps: n })}
        onOnlyAffordableChange={(b) => setPrefs({ onlyAffordable: b })}
        onOpenRphDialog={() => setRphOpen(true)}
        onResourceFilterChange={(id) =>
          setPrefs({ tachyonFilter: idToTachyonFilter(id) })
        }
        resourceFilterLabel="resource"
        resourceFilterOptions={TACHYON_FILTER_OPTIONS}
        resourceFilterValue={tachyonFilterToId(prefs.tachyonFilter ?? "all")}
        rightSlot={(() => {
          const upgraderDisabled =
            !prefs.onlyAffordable || upgraderSteps.length === 0 || dataIsStale;
          const upgraderHint = dataIsStale
            ? "waiting for upgrade levels to update - idleon hasn't synced post-run state yet"
            : prefs.onlyAffordable
              ? upgraderSteps.length === 0
                ? "no affordable upgrades found - tweak the optimizer or earn more tachyons"
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
      />
      <OptimizerTable
        formatCost={(cost, resourceId) => (
          <span>
            {notateNumber(cost)}{" "}
            <span className="text-text-dim">{resourceId}</span>
          </span>
        )}
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
