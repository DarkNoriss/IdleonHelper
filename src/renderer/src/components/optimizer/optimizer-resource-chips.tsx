import { notateNumber } from "@/lib/notateNumber";

type Resource = { id: string; label: string; value: number };
type DailyDiscounts = { remaining: number; max: number };

type Props = {
  inventory: readonly Resource[];
  dailyDiscounts?: DailyDiscounts;
  formatValue?: (v: number) => string;
};

const DAILY_DISCOUNTS_WARN_THRESHOLD = 5;

export const OptimizerResourceChips = ({
  inventory,
  dailyDiscounts,
  formatValue = notateNumber,
}: Props) => {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 font-mono text-[11px]">
      <div className="flex flex-wrap items-center gap-3">
        {inventory.map((r) => (
          <span className="text-text-dim" key={r.id}>
            {r.label}:{" "}
            <span className="text-foreground">{formatValue(r.value)}</span>
          </span>
        ))}
      </div>

      {dailyDiscounts && (
        <span
          className={`ml-auto ${
            dailyDiscounts.remaining < DAILY_DISCOUNTS_WARN_THRESHOLD
              ? "text-warn"
              : "text-text-dim"
          }`}
          title="shared across compass / tesseract / grimoire - resets at game daily reset"
        >
          daily discounts:{" "}
          <span
            className={
              dailyDiscounts.remaining < DAILY_DISCOUNTS_WARN_THRESHOLD
                ? "text-warn"
                : "text-foreground"
            }
          >
            {dailyDiscounts.remaining}/{dailyDiscounts.max}
          </span>
        </span>
      )}
    </div>
  );
};
