import { useMemo, useState } from "react";
import { OptimizerResourceChips } from "@/components/optimizer/optimizer-resource-chips";
import {
  OptimizerRphDialog,
  type RphRates,
  type RphResource,
} from "@/components/optimizer/optimizer-rph-dialog";
import { OptimizerTable } from "@/components/optimizer/optimizer-table";
import { OptimizerToolbar } from "@/components/optimizer/optimizer-toolbar";
import { notateNumber } from "@/lib/notateNumber";
import {
  computeCompassPath,
  DUST_RESOURCE_IDS,
} from "@/parsers/compass-optimizer";
import { groupSteps } from "@/parsers/optimizer-core";
import { useGameData } from "@/providers/game-data-provider";
import { useUiPrefsStore } from "@/store/ui-prefs";
import type {
  CompassCategory,
  CompassDustFilter,
  CompassRphRates,
} from "@/types/compass";

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
  { id: "all", label: "all dusts" },
  { id: "0", label: "stardust" },
  { id: "1", label: "moondust" },
  { id: "2", label: "solardust" },
  { id: "3", label: "cooldust" },
  { id: "4", label: "novadust" },
];

function dustFilterToId(f: CompassDustFilter): string {
  return f === "all" ? "all" : String(f);
}

function idToDustFilter(id: string): CompassDustFilter {
  if (id === "all") {
    return "all";
  }
  const n = Number(id);
  if (n === 0 || n === 1 || n === 2 || n === 3 || n === 4) {
    return n;
  }
  return "all";
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

  const [rphOpen, setRphOpen] = useState(false);

  const rows = useMemo(() => {
    if (!compass) {
      return [];
    }
    const steps = computeCompassPath({
      data: compass,
      category: prefs.category,
      // Compass always scores by time-to-afford; with rph defaulting to 1
      // this collapses to plain-cost behavior, so a separate cost/perHour
      // toggle would just confuse users. The set-rph dialog is the only
      // control needed.
      scoreMode: "perHour",
      rph: prefs.rph,
      dustFilter: prefs.dustFilter ?? "all",
      maxSteps: prefs.maxSteps,
      groupMode: prefs.groupMode,
      onlyAffordable: prefs.onlyAffordable,
    });
    return groupSteps(steps, prefs.groupMode, prefs.category !== "all");
  }, [compass, prefs]);

  if (!compass) {
    return (
      <div className="rounded-[5px] border border-border bg-panel p-4 text-center font-mono text-[11px] text-text-dim">
        no compass data — load your save first via the cloudsave page
      </div>
    );
  }

  const isMetric = prefs.category !== "all";

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
      <OptimizerToolbar
        categories={CATEGORY_OPTIONS}
        category={prefs.category}
        groupMode={prefs.groupMode}
        maxSteps={prefs.maxSteps}
        maxStepsOptions={MAX_STEPS_OPTIONS}
        onCategoryChange={(c) => setPrefs({ category: c as CompassCategory })}
        onGroupModeChange={(m) => setPrefs({ groupMode: m })}
        onlyAffordable={prefs.onlyAffordable}
        onMaxStepsChange={(n) => setPrefs({ maxSteps: n })}
        onOnlyAffordableChange={(b) => setPrefs({ onlyAffordable: b })}
        onOpenRphDialog={() => setRphOpen(true)}
        onResourceFilterChange={(id) =>
          setPrefs({ dustFilter: idToDustFilter(id) })
        }
        resourceFilterLabel="resource"
        resourceFilterOptions={DUST_FILTER_OPTIONS}
        resourceFilterValue={dustFilterToId(prefs.dustFilter ?? "all")}
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
