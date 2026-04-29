import type { ReactNode } from "react";
import { TermCheckbox, TermSelect } from "@/components/terminal";
import type { OptimizerGroupMode } from "@/parsers/optimizer-core";

type CategoryOption = { id: string; label: string };

type ScoreMode = "cost" | "perHour";

type Props = {
  categories: readonly CategoryOption[];
  category: string;
  onCategoryChange: (id: string) => void;

  maxStepsOptions: readonly number[];
  maxSteps: number;
  onMaxStepsChange: (n: number) => void;

  groupMode: OptimizerGroupMode;
  onGroupModeChange: (m: OptimizerGroupMode) => void;

  onlyAffordable: boolean;
  onOnlyAffordableChange: (b: boolean) => void;

  // Optional RPH controls -- phase 1 will pass these from compass.
  // When undefined, the corresponding controls are not rendered (sushi case).
  scoreMode?: ScoreMode;
  onScoreModeChange?: (m: ScoreMode) => void;
  onOpenRphDialog?: () => void;
  rphDirty?: boolean;

  // Anything caller wants pinned to the right edge of the toolbar (e.g.
  // single-currency inventory display). Rendered last, with ml-auto.
  rightSlot?: ReactNode;
};

const GROUP_MODE_OPTIONS: readonly {
  value: OptimizerGroupMode;
  label: string;
}[] = [
  { value: "none", label: "none" },
  { value: "upgrade", label: "upgrade" },
  { value: "summary", label: "summary" },
];

export const OptimizerToolbar = ({
  categories,
  category,
  onCategoryChange,
  maxStepsOptions,
  maxSteps,
  onMaxStepsChange,
  groupMode,
  onGroupModeChange,
  onlyAffordable,
  onOnlyAffordableChange,
  scoreMode,
  onScoreModeChange,
  onOpenRphDialog,
  rphDirty,
  rightSlot,
}: Props) => {
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.label,
  }));
  const maxStepsSelectOptions = maxStepsOptions.map((n) => ({
    value: String(n),
    label: String(n),
  }));

  return (
    <div className="mb-3 flex flex-wrap items-end gap-3 font-mono text-[11px]">
      <div className="flex flex-col gap-1">
        <span className="text-text-dim">optimize for</span>
        <TermSelect
          onChange={onCategoryChange}
          options={categoryOptions}
          value={category}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-text-dim">max upgrades</span>
        <TermSelect
          onChange={(v) => onMaxStepsChange(Number(v))}
          options={maxStepsSelectOptions}
          value={String(maxSteps)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-text-dim">group</span>
        <TermSelect
          onChange={(v) => onGroupModeChange(v as OptimizerGroupMode)}
          options={GROUP_MODE_OPTIONS}
          value={groupMode}
        />
      </div>

      <TermCheckbox
        checked={onlyAffordable}
        label="show only affordable"
        onChange={onOnlyAffordableChange}
      />

      {scoreMode !== undefined && onScoreModeChange && (
        <div className="flex items-center gap-1 rounded-[3px] border border-border bg-surface p-0.5">
          <button
            className={`rounded-[2px] px-2 py-[3px] ${
              scoreMode === "cost"
                ? "bg-primary text-primary-ink"
                : "text-text-dim hover:text-foreground"
            }`}
            onClick={() => onScoreModeChange("cost")}
            type="button"
          >
            cost
          </button>
          <button
            className={`rounded-[2px] px-2 py-[3px] ${
              scoreMode === "perHour"
                ? "bg-primary text-primary-ink"
                : "text-text-dim hover:text-foreground"
            }`}
            onClick={() => onScoreModeChange("perHour")}
            type="button"
          >
            per hour
          </button>
        </div>
      )}

      {onOpenRphDialog && (
        <button
          className="relative rounded-[3px] border border-border bg-surface px-2 py-[5px] text-text-dim hover:text-foreground"
          onClick={onOpenRphDialog}
          type="button"
        >
          set rph
          {rphDirty && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </button>
      )}

      {rightSlot && <div className="ml-auto">{rightSlot}</div>}
    </div>
  );
};
