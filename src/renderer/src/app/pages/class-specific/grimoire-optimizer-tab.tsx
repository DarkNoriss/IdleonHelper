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
  BONE_RESOURCE_IDS,
  computeGrimoirePath,
} from "@/parsers/grimoire-optimizer";
import { groupSteps } from "@/parsers/optimizer-core";
import { useGameData } from "@/providers/game-data-provider";
import { useUiPrefsStore } from "@/store/ui-prefs";
import type {
  GrimoireBoneFilter,
  GrimoireCategory,
  GrimoireRphRates,
} from "@/types/grimoire";

const CATEGORY_OPTIONS: readonly { id: GrimoireCategory; label: string }[] = [
  { id: "all", label: "all (cheapest)" },
  { id: "damage", label: "damage" },
  { id: "accuracy", label: "accuracy" },
  { id: "defence", label: "defence" },
  { id: "hp", label: "hp" },
  { id: "crit", label: "crit" },
  { id: "extraBones", label: "extra bones" },
];

const MAX_STEPS_OPTIONS = [10, 25, 50, 100, 300] as const;

const BONE_LABELS: Record<string, string> = {
  femur: "femur",
  ribcage: "ribcage",
  cranium: "cranium",
  bovinae: "bovinae",
};

const RPH_RESOURCES: readonly RphResource[] = BONE_RESOURCE_IDS.map((id) => ({
  id,
  label: BONE_LABELS[id] ?? id,
}));

const BONE_FILTER_OPTIONS: readonly { id: string; label: string }[] = [
  { id: "all", label: "all bones" },
  { id: "0", label: "femur" },
  { id: "1", label: "ribcage" },
  { id: "2", label: "cranium" },
  { id: "3", label: "bovinae" },
];

function boneFilterToId(f: GrimoireBoneFilter): string {
  return f === "all" ? "all" : String(f);
}

function idToBoneFilter(id: string): GrimoireBoneFilter {
  if (id === "all") {
    return "all";
  }
  const n = Number(id);
  if (n === 0 || n === 1 || n === 2 || n === 3) {
    return n;
  }
  return "all";
}

const DEFAULT_RPH = 1;

function rphToStringKeyed(rph: GrimoireRphRates): RphRates {
  return {
    femur: rph[0],
    ribcage: rph[1],
    cranium: rph[2],
    bovinae: rph[3],
  };
}

function stringKeyedToRph(rates: RphRates): GrimoireRphRates {
  return {
    0: rates.femur ?? DEFAULT_RPH,
    1: rates.ribcage ?? DEFAULT_RPH,
    2: rates.cranium ?? DEFAULT_RPH,
    3: rates.bovinae ?? DEFAULT_RPH,
  };
}

function isRphDirty(rph: GrimoireRphRates): boolean {
  return (
    rph[0] !== DEFAULT_RPH ||
    rph[1] !== DEFAULT_RPH ||
    rph[2] !== DEFAULT_RPH ||
    rph[3] !== DEFAULT_RPH
  );
}

export const GrimoireOptimizerTab = () => {
  const { grimoire } = useGameData();
  const prefs = useUiPrefsStore((s) => s.grimoireOptimizer);
  const setPrefs = useUiPrefsStore((s) => s.setGrimoireOptimizer);

  const [rphOpen, setRphOpen] = useState(false);

  const rows = useMemo(() => {
    if (!grimoire) {
      return [];
    }
    const steps = computeGrimoirePath({
      data: grimoire,
      category: prefs.category,
      rph: prefs.rph,
      boneFilter: prefs.boneFilter ?? "all",
      maxSteps: prefs.maxSteps,
      groupMode: prefs.groupMode,
      onlyAffordable: prefs.onlyAffordable,
    });
    return groupSteps(steps, prefs.groupMode, prefs.category !== "all");
  }, [grimoire, prefs]);

  if (!grimoire) {
    return (
      <div className="rounded-[5px] border border-border bg-panel p-4 text-center font-mono text-[11px] text-text-dim">
        no grimoire data - load your save first via the cloudsave page
      </div>
    );
  }

  const isMetric = prefs.category !== "all";

  const inventory = BONE_RESOURCE_IDS.map((id, i) => ({
    id,
    label: BONE_LABELS[id] ?? id,
    value: grimoire.bones[i] ?? 0,
  }));

  const dailyDiscounts = grimoire.hasLegendTalent
    ? {
        remaining: grimoire.dailyDiscountsRemaining,
        max: grimoire.dailyDiscountsMax,
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
        onCategoryChange={(c) => setPrefs({ category: c as GrimoireCategory })}
        onGroupModeChange={(m) => setPrefs({ groupMode: m })}
        onlyAffordable={prefs.onlyAffordable}
        onMaxStepsChange={(n) => setPrefs({ maxSteps: n })}
        onOnlyAffordableChange={(b) => setPrefs({ onlyAffordable: b })}
        onOpenRphDialog={() => setRphOpen(true)}
        onResourceFilterChange={(id) =>
          setPrefs({ boneFilter: idToBoneFilter(id) })
        }
        resourceFilterLabel="resource"
        resourceFilterOptions={BONE_FILTER_OPTIONS}
        resourceFilterValue={boneFilterToId(prefs.boneFilter ?? "all")}
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
