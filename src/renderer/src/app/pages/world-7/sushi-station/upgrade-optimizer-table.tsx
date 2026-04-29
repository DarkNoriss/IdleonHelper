import { notateNumber } from "@/lib/notateNumber";
import type { OptimizerCategory, OptimizerRow } from "@/types/sushi-station";

const HAS_METRIC: Record<OptimizerCategory, boolean> = {
  all: false,
  bucks: true,
  fuelRate: true,
  fuelCap: true,
};

const formatScientific = (n: number): string => n.toExponential(2);

type Props = {
  rows: readonly OptimizerRow[];
  category: OptimizerCategory;
};

export const UpgradeOptimizerTable = ({ rows, category }: Props) => {
  if (rows.length === 0) {
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
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              className="border-border-soft border-t text-foreground"
              key={`${r.rank}-${r.name}`}
            >
              <td className="px-3 py-1 text-text-dim">{r.rank}</td>
              <td className="px-3 py-1">
                {r.name}
                {r.count > 1 && (
                  <span className="ml-1 text-text-dim">×{r.count}</span>
                )}
              </td>
              <td className="px-3 py-1">
                <span className="text-text-dim">{r.fromLevel}</span>
                <span className="px-1 text-text-muted">{">"}</span>
                <span className="text-primary">{r.toLevel}</span>
              </td>
              <td className="px-3 py-1 text-right">{notateNumber(r.cost)}</td>
              <td className="px-3 py-1 text-right">
                {showMetric && r.gain !== null ? notateNumber(r.gain) : "-"}
              </td>
              <td className="px-3 py-1 text-right text-text-dim">
                {showMetric && r.efficiency !== null
                  ? formatScientific(r.efficiency)
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
