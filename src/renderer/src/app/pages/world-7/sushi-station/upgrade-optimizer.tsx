import { useMemo } from "react";
import { OptimizerResourceChips } from "@/components/optimizer/optimizer-resource-chips";
import { OptimizerTable } from "@/components/optimizer/optimizer-table";
import { OptimizerToolbar } from "@/components/optimizer/optimizer-toolbar";
import { notateNumber } from "@/lib/notateNumber";
import { groupSteps } from "@/parsers/optimizer-core";
import { computeSushiPath } from "@/parsers/sushi-station-optimizer";
import { useGameData } from "@/providers/game-data-provider";
import { useUiPrefsStore } from "@/store/ui-prefs";
import {
  OPTIMIZER_MAX_STEPS_OPTIONS,
  type OptimizerCategory,
  type OptimizerMaxSteps,
} from "@/types/sushi-station";

const CATEGORY_OPTIONS: readonly { id: OptimizerCategory; label: string }[] = [
  { id: "all", label: "all (cheapest)" },
  { id: "bucks", label: "bucks/hr" },
  { id: "fuelRate", label: "fuel/hr" },
  { id: "fuelCap", label: "fuel cap" },
];

export const UpgradeOptimizer = () => {
  const { sushiStation } = useGameData();
  const prefs = useUiPrefsStore((s) => s.sushiOptimizer);
  const setPrefs = useUiPrefsStore((s) => s.setSushiOptimizer);

  const rows = useMemo(() => {
    if (!sushiStation) {
      return [];
    }
    const steps = computeSushiPath({
      data: sushiStation,
      category: prefs.category,
      maxSteps: prefs.maxSteps,
      onlyAffordable: prefs.onlyAffordable,
    });
    return groupSteps(steps, prefs.groupMode, prefs.category !== "all");
  }, [sushiStation, prefs]);

  if (!sushiStation) {
    return (
      <div className="rounded-[5px] border border-border bg-panel p-4 text-center font-mono text-[11px] text-text-dim">
        no sushi station data — load your save first via the cloudsave page
      </div>
    );
  }

  const isMetric = prefs.category !== "all";

  return (
    <div className="flex flex-col">
      <OptimizerResourceChips
        inventory={[{ id: "bucks", label: "bucks", value: sushiStation.bucks }]}
      />
      <OptimizerToolbar
        categories={CATEGORY_OPTIONS}
        category={prefs.category}
        groupMode={prefs.groupMode}
        maxSteps={prefs.maxSteps}
        maxStepsOptions={OPTIMIZER_MAX_STEPS_OPTIONS}
        onCategoryChange={(c) => setPrefs({ category: c as OptimizerCategory })}
        onGroupModeChange={(m) => setPrefs({ groupMode: m })}
        onlyAffordable={prefs.onlyAffordable}
        onMaxStepsChange={(n) => setPrefs({ maxSteps: n as OptimizerMaxSteps })}
        onOnlyAffordableChange={(b) => setPrefs({ onlyAffordable: b })}
      />
      <OptimizerTable
        formatCost={(cost) => notateNumber(cost)}
        formatGain={(gain) => notateNumber(gain)}
        isMetric={isMetric}
        rows={rows}
      />
    </div>
  );
};
