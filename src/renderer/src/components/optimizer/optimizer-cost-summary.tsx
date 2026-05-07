import { formatDurationHours } from "@/lib/format-duration";
import { notateNumber } from "@/lib/notateNumber";

export type OptimizerCostItem = {
  id: string;
  label: string;
  totalCost: number;
  currentHave: number;
  rph: number;
};

type Props = {
  items: readonly OptimizerCostItem[];
  formatCost?: (n: number) => string;
};

export const OptimizerCostSummary = ({
  items,
  formatCost = notateNumber,
}: Props) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-2.5 rounded-[5px] border border-border bg-panel p-2.5 font-mono text-[11px]">
      <div className="mb-2 text-text-dim">--upgrade costs</div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {items.map((item) => {
          const deficit = Math.max(0, item.totalCost - item.currentHave);
          const ready = deficit === 0;
          const time =
            item.rph > 0 ? formatDurationHours(deficit / item.rph) : "--";
          return (
            <div className="flex min-w-[80px] flex-col" key={item.id}>
              <span className="text-text-dim">{item.label}</span>
              <span className="text-foreground">
                {formatCost(item.totalCost)}
              </span>
              <span className="text-[10px] text-text-muted">
                {ready ? "ready" : time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
