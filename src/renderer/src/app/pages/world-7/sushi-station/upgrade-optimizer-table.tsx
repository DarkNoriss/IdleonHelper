import { notateNumber } from "@/lib/notateNumber";
import type { OptimizerCategory, OptimizerStep } from "@/types/sushi-station";

const HAS_METRIC: Record<OptimizerCategory, boolean> = {
  all: false,
  bucks: true,
  fuelRate: true,
  fuelCap: true,
};

const formatScientific = (n: number): string => n.toExponential(2);

type Props = {
  steps: readonly OptimizerStep[];
  category: OptimizerCategory;
};

export const UpgradeOptimizerTable = ({ steps, category }: Props) => {
  if (steps.length === 0) {
    return (
      <div className="rounded-[5px] border border-border bg-panel p-4 text-center font-mono text-[11px] text-text-dim">
        no upgrades match these filters
      </div>
    );
  }

  const showMetric = HAS_METRIC[category];

  return (
    <div className="overflow-x-auto rounded-[5px] border border-border bg-panel">
      <table className="w-full font-mono text-[11px]">
        <thead className="bg-panel-2 text-text-dim">
          <tr>
            <th className="px-3 py-1.5 text-left">#</th>
            <th className="px-3 py-1.5 text-left">upgrade</th>
            <th className="px-3 py-1.5 text-left">lvl</th>
            <th className="px-3 py-1.5 text-right">cost</th>
            <th className="px-3 py-1.5 text-right">gain</th>
            <th className="px-3 py-1.5 text-right">eff.</th>
            <th className="px-3 py-1.5 text-right">cumul.</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s) => (
            <tr
              className="border-border-soft border-t text-foreground"
              key={s.rank}
            >
              <td className="px-3 py-1 text-text-dim">{s.rank}</td>
              <td className="px-3 py-1">{s.name}</td>
              <td className="px-3 py-1">
                <span className="text-text-dim">{s.fromLevel}</span>
                <span className="px-1 text-text-muted">{">"}</span>
                <span className="text-primary">{s.toLevel}</span>
              </td>
              <td className="px-3 py-1 text-right">{notateNumber(s.cost)}</td>
              <td className="px-3 py-1 text-right">
                {showMetric && s.gain !== null ? notateNumber(s.gain) : "-"}
              </td>
              <td className="px-3 py-1 text-right text-text-dim">
                {showMetric && s.efficiency !== null
                  ? formatScientific(s.efficiency)
                  : "-"}
              </td>
              <td className="px-3 py-1 text-right text-text-dim">
                {notateNumber(s.cumulativeCost)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
