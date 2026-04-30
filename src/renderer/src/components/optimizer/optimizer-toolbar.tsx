import { type ReactNode, useEffect, useState } from "react";
import { TermCheckbox, TermInput, TermSelect } from "@/components/terminal";
import type { OptimizerGroupMode } from "@/parsers/optimizer-core";

const MAX_STEPS_FLOOR = 1;
const MAX_STEPS_CEILING = 9999;
const CUSTOM_OPTION_VALUE = "custom";

type SelectOption = { id: string; label: string };

type ScoreMode = "cost" | "perHour";

type Props = {
  categories: readonly SelectOption[];
  category: string;
  onCategoryChange: (id: string) => void;

  maxStepsOptions: readonly number[];
  maxSteps: number;
  onMaxStepsChange: (n: number) => void;

  groupMode: OptimizerGroupMode;
  onGroupModeChange: (m: OptimizerGroupMode) => void;

  onlyAffordable: boolean;
  onOnlyAffordableChange: (b: boolean) => void;

  // Optional RPH controls. When undefined, the corresponding controls are
  // not rendered (sushi case). The set-rph button renders right after the
  // category select so users see resource configuration as one cluster.
  scoreMode?: ScoreMode;
  onScoreModeChange?: (m: ScoreMode) => void;
  onOpenRphDialog?: () => void;
  rphDirty?: boolean;

  // Optional secondary filter (e.g. compass dust-type). Renders right after
  // the rph button. `label` is shown above the select.
  resourceFilterLabel?: string;
  resourceFilterOptions?: readonly SelectOption[];
  resourceFilterValue?: string;
  onResourceFilterChange?: (id: string) => void;

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
  resourceFilterLabel,
  resourceFilterOptions,
  resourceFilterValue,
  onResourceFilterChange,
  rightSlot,
}: Props) => {
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.label,
  }));
  const maxStepsSelectOptions = [
    ...maxStepsOptions.map((n) => ({ value: String(n), label: String(n) })),
    { value: CUSTOM_OPTION_VALUE, label: "custom" },
  ];
  const resourceFilterSelectOptions = resourceFilterOptions?.map((o) => ({
    value: o.id,
    label: o.label,
  }));

  // "custom mode" is a UI flag — once toggled on, the user types into the
  // input even if their typed value happens to match a preset. Sync once on
  // mount and again whenever an external reset lands a non-preset value.
  const [customMaxSteps, setCustomMaxSteps] = useState(
    () => !maxStepsOptions.includes(maxSteps)
  );
  const [customMaxStepsDraft, setCustomMaxStepsDraft] = useState(
    String(maxSteps)
  );
  useEffect(() => {
    setCustomMaxStepsDraft(String(maxSteps));
    if (!maxStepsOptions.includes(maxSteps)) {
      setCustomMaxSteps(true);
    }
  }, [maxSteps, maxStepsOptions]);

  const handleMaxStepsSelectChange = (v: string) => {
    if (v === CUSTOM_OPTION_VALUE) {
      setCustomMaxSteps(true);
      return;
    }
    setCustomMaxSteps(false);
    onMaxStepsChange(Number(v));
  };

  const commitCustomMaxSteps = (raw: string) => {
    const parsed = Math.floor(Number(raw));
    if (!Number.isFinite(parsed) || parsed < MAX_STEPS_FLOOR) {
      setCustomMaxStepsDraft(String(maxSteps));
      return;
    }
    const clamped = Math.min(parsed, MAX_STEPS_CEILING);
    setCustomMaxStepsDraft(String(clamped));
    if (clamped !== maxSteps) {
      onMaxStepsChange(clamped);
    }
  };

  const showResourceFilter =
    resourceFilterSelectOptions !== undefined &&
    resourceFilterValue !== undefined &&
    onResourceFilterChange !== undefined;

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

      {showResourceFilter && (
        <div className="flex flex-col gap-1">
          <span className="text-text-dim">
            {resourceFilterLabel ?? "resource"}
          </span>
          <TermSelect
            onChange={onResourceFilterChange}
            options={resourceFilterSelectOptions}
            value={resourceFilterValue}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-text-dim">max upgrades</span>
        <div className="flex items-center gap-2">
          <TermSelect
            onChange={handleMaxStepsSelectChange}
            options={maxStepsSelectOptions}
            value={customMaxSteps ? CUSTOM_OPTION_VALUE : String(maxSteps)}
          />
          {customMaxSteps && (
            <TermInput
              className="w-20"
              inputMode="numeric"
              onBlur={(e) => commitCustomMaxSteps(e.target.value)}
              onChange={setCustomMaxStepsDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitCustomMaxSteps(e.currentTarget.value);
                }
              }}
              value={customMaxStepsDraft}
            />
          )}
        </div>
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

      {rightSlot && <div className="ml-auto">{rightSlot}</div>}
    </div>
  );
};
