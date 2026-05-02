import { type ReactNode, useEffect, useState } from "react";
import { TermCheckbox, TermInput, TermSelect } from "@/components/terminal";
import { cn } from "@/lib/utils";
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

  // Persisted "custom slot" — the value the input restores when the user
  // toggles back to custom after picking a preset. When omitted, the toolbar
  // falls back to the legacy behaviour where custom shares storage with
  // `maxSteps` and gets clobbered by preset selections.
  customMaxSteps?: number;
  onCustomMaxStepsChange?: (n: number) => void;

  groupMode: OptimizerGroupMode;
  onGroupModeChange: (m: OptimizerGroupMode) => void;

  onlyAffordable: boolean;
  onOnlyAffordableChange: (b: boolean) => void;

  // Optional RPH controls. When undefined, the corresponding controls are
  // not rendered (sushi case).
  scoreMode?: ScoreMode;
  onScoreModeChange?: (m: ScoreMode) => void;
  onOpenRphDialog?: () => void;
  rphDirty?: boolean;

  // Optional secondary filter (e.g. compass dust-type). `label` is the bare
  // noun shown above the select; the toolbar prepends "--" automatically.
  resourceFilterLabel?: string;
  resourceFilterOptions?: readonly SelectOption[];
  resourceFilterValue?: string;
  onResourceFilterChange?: (id: string) => void;

  // Total upgrade levels currently shown — sum of `OptimizerRow.count` across
  // all visible rows, NOT the row count. (One row "+3 levels" counts as 3.)
  // Rendered as "showing X upgrades" on row 2, left of `rightSlot`.
  upgradeCount?: number;

  // Action node pinned to the right edge of row 2 (e.g. "run upgrader"
  // button on the class-specific upgraders).
  rightSlot?: ReactNode;

  className?: string;
};

const GROUP_MODE_OPTIONS: readonly {
  value: OptimizerGroupMode;
  label: string;
}[] = [
  { value: "none", label: "none" },
  { value: "upgrade", label: "upgrade" },
  { value: "summary", label: "summary" },
];

const FlagLabel = ({ children }: { children: string }) => (
  <span className="text-text-dim">--{children}</span>
);

export const OptimizerToolbar = ({
  categories,
  category,
  onCategoryChange,
  maxStepsOptions,
  maxSteps,
  onMaxStepsChange,
  customMaxSteps,
  onCustomMaxStepsChange,
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
  upgradeCount,
  rightSlot,
  className,
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
  const [inCustomMode, setInCustomMode] = useState(
    () => !maxStepsOptions.includes(maxSteps)
  );
  const [customMaxStepsDraft, setCustomMaxStepsDraft] = useState(
    String(maxSteps)
  );
  useEffect(() => {
    setCustomMaxStepsDraft(String(maxSteps));
    if (!maxStepsOptions.includes(maxSteps)) {
      setInCustomMode(true);
    }
  }, [maxSteps, maxStepsOptions]);

  const handleMaxStepsSelectChange = (v: string) => {
    if (v === CUSTOM_OPTION_VALUE) {
      setInCustomMode(true);
      // Restore the saved custom slot (when wired). Without it, fall back to
      // the current `maxSteps` so the input simply takes over the field.
      if (customMaxSteps !== undefined && customMaxSteps !== maxSteps) {
        onMaxStepsChange(customMaxSteps);
      }
      return;
    }
    setInCustomMode(false);
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
    onCustomMaxStepsChange?.(clamped);
  };

  const showResourceFilter =
    resourceFilterSelectOptions !== undefined &&
    resourceFilterValue !== undefined &&
    onResourceFilterChange !== undefined;

  return (
    <div className={cn("font-mono text-[11px]", className)}>
      {/* Row 1 — filters (optimize-for, resources, set rph | spacer | max-upgrades, group) */}
      <div className="mb-2 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <FlagLabel>optimize-for</FlagLabel>
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

        {showResourceFilter && (
          <div className="flex flex-col gap-1">
            <FlagLabel>{resourceFilterLabel ?? "resources"}</FlagLabel>
            <TermSelect
              onChange={onResourceFilterChange}
              options={resourceFilterSelectOptions}
              value={resourceFilterValue}
            />
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

        {/* 1px vertical divider — matches select height via h-7 + items-end on
            the row aligns its bottom to the selects' bottom. Visual separator
            between the resource cluster and the display-control cluster. */}
        <div aria-hidden className="h-7 w-px bg-border" />

        <div className="flex flex-col gap-1">
          <FlagLabel>max-upgrades</FlagLabel>
          <div className="flex items-center gap-2">
            <TermSelect
              className="min-w-[100px]"
              onChange={handleMaxStepsSelectChange}
              options={maxStepsSelectOptions}
              value={inCustomMode ? CUSTOM_OPTION_VALUE : String(maxSteps)}
            />
            {inCustomMode && (
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
          <FlagLabel>group</FlagLabel>
          <TermSelect
            onChange={(v) => onGroupModeChange(v as OptimizerGroupMode)}
            options={GROUP_MODE_OPTIONS}
            value={groupMode}
          />
        </div>
      </div>

      {/* Row 2 — actions (show only affordable | spacer | showing N upgrades, rightSlot) */}
      <div className="flex flex-wrap items-center gap-3">
        <TermCheckbox
          checked={onlyAffordable}
          label="show only affordable"
          onChange={onOnlyAffordableChange}
        />
        <div className="ml-auto flex items-center gap-2.5">
          {upgradeCount !== undefined && (
            <span className="text-[10px] text-text-muted">
              showing <span className="text-text-dim">{upgradeCount}</span>{" "}
              upgrades
            </span>
          )}
          {rightSlot}
        </div>
      </div>
    </div>
  );
};
