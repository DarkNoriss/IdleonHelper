import type { ReactNode } from "react";
import type { OptimizerRow } from "@/parsers/optimizer-core";

type Props = {
  rows: readonly OptimizerRow[];
  isMetric: boolean;
  formatCost: (cost: number, resourceId: string) => ReactNode;
  formatGain?: (gain: number) => ReactNode;
  emptyMessage?: string;
};

const defaultFormatGain = (gain: number): string => gain.toExponential(2);
const formatScientific = (n: number): string => n.toExponential(2);

export const OptimizerTable = ({
  rows,
  isMetric,
  formatCost,
  formatGain = defaultFormatGain,
  emptyMessage = "no upgrades match these filters",
}: Props) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-[5px] border border-border bg-panel p-4 text-center font-mono text-[11px] text-text-dim">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[5px] border border-border bg-panel">
      <table className="w-full font-mono text-[11px]">
        <thead className="bg-panel-2 text-text-dim">
          <tr>
            <th className="px-3 py-1.5 text-left">#</th>
            <th className="px-3 py-1.5 text-left">upgrade</th>
            <th className="px-3 py-1.5 text-left">lvl</th>
            <th className="px-3 py-1.5 text-right">cost</th>
            {isMetric && <th className="px-3 py-1.5 text-right">gain</th>}
            {isMetric && <th className="px-3 py-1.5 text-right">eff.</th>}
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
              <td className="px-3 py-1 text-right">
                {formatCost(r.cost, r.resourceId)}
              </td>
              {isMetric && (
                <td className="px-3 py-1 text-right">
                  {r.gain === null ? "-" : formatGain(r.gain)}
                </td>
              )}
              {isMetric && (
                <td className="px-3 py-1 text-right text-text-dim">
                  {r.efficiency === null ? "-" : formatScientific(r.efficiency)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
