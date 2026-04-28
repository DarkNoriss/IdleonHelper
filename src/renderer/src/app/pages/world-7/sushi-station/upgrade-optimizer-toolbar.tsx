import { TermCheckbox, TermSelect } from "@/components/terminal";
import { notateNumber } from "@/lib/notateNumber";
import { useUiPrefsStore } from "@/store/ui-prefs";
import {
  OPTIMIZER_MAX_STEPS_OPTIONS,
  type OptimizerCategory,
  type OptimizerMaxSteps,
} from "@/types/sushi-station";

const CATEGORY_OPTIONS: readonly { value: OptimizerCategory; label: string }[] =
  [
    { value: "all", label: "all (cheapest)" },
    { value: "bucks", label: "bucks/hr" },
    { value: "fuelRate", label: "fuel/hr" },
    { value: "fuelCap", label: "fuel cap" },
  ];

const MAX_STEPS_OPTIONS = OPTIMIZER_MAX_STEPS_OPTIONS.map((n) => ({
  value: String(n),
  label: String(n),
}));

type Props = {
  bucks: number;
};

export const UpgradeOptimizerToolbar = ({ bucks }: Props) => {
  const prefs = useUiPrefsStore((s) => s.sushiOptimizer);
  const setPrefs = useUiPrefsStore((s) => s.setSushiOptimizer);

  return (
    <div className="mb-3 flex flex-wrap items-end gap-3 font-mono text-[11px]">
      <div className="flex flex-col gap-1">
        <span className="text-text-dim">optimize for</span>
        <TermSelect
          onChange={(v) => setPrefs({ category: v as OptimizerCategory })}
          options={CATEGORY_OPTIONS}
          value={prefs.category}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-text-dim">max upgrades</span>
        <TermSelect
          onChange={(v) =>
            setPrefs({ maxSteps: Number(v) as OptimizerMaxSteps })
          }
          options={MAX_STEPS_OPTIONS}
          value={String(prefs.maxSteps)}
        />
      </div>

      <TermCheckbox
        checked={prefs.onlyAffordable}
        label="show only affordable"
        onChange={(v) => setPrefs({ onlyAffordable: v })}
      />

      <div className="ml-auto text-text-dim">
        bucks: <span className="text-foreground">{notateNumber(bucks)}</span>
      </div>
    </div>
  );
};
