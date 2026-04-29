import { groupSteps } from "@/parsers/optimizer-core";
import { computeSushiPath } from "@/parsers/sushi-station-optimizer";
import { useGameData } from "@/providers/game-data-provider";
import { useUiPrefsStore } from "@/store/ui-prefs";
import { UpgradeOptimizerTable } from "./upgrade-optimizer-table";
import { UpgradeOptimizerToolbar } from "./upgrade-optimizer-toolbar";

export const UpgradeOptimizer = () => {
  const { sushiStation } = useGameData();
  const prefs = useUiPrefsStore((s) => s.sushiOptimizer);

  if (!sushiStation) {
    return (
      <div className="rounded-[5px] border border-border bg-panel p-4 text-center font-mono text-[11px] text-text-dim">
        no sushi station data — load your save first via the cloudsave page
      </div>
    );
  }

  const steps = computeSushiPath({
    data: sushiStation,
    category: prefs.category,
    maxSteps: prefs.maxSteps,
    onlyAffordable: prefs.onlyAffordable,
  });

  const rows = groupSteps(steps, prefs.groupMode, prefs.category !== "all");

  return (
    <div className="flex flex-col">
      <UpgradeOptimizerToolbar bucks={sushiStation.bucks} />
      <UpgradeOptimizerTable category={prefs.category} rows={rows} />
    </div>
  );
};
