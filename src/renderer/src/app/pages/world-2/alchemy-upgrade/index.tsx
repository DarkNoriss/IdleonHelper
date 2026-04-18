import { useEffect, useMemo } from "react";
import { ScriptPage } from "@/components/script-page.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";
import type { Selections } from "@/types/alchemy";
import { BUBBLES_BY_CAULDRON, CAULDRON_LABELS } from "./bubble-registry";

const NONE = "__none__";
const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 1440;

const clampInterval = (raw: number): number => {
  if (!Number.isFinite(raw)) {
    return MIN_INTERVAL_MINUTES;
  }
  return Math.max(
    MIN_INTERVAL_MINUTES,
    Math.min(MAX_INTERVAL_MINUTES, Math.floor(raw))
  );
};

const sanitizeSelections = (selections: Selections): Selections => {
  const next: Selections = { ...selections };
  for (const key of Object.keys(BUBBLES_BY_CAULDRON) as (keyof Selections)[]) {
    const value = next[key];
    if (value === null || value === "") {
      continue;
    }
    const valid = BUBBLES_BY_CAULDRON[key].some((o) => o.value === value);
    if (!valid) {
      next[key] = null;
    }
  }
  return next;
};

const selectionsEqual = (a: Selections, b: Selections): boolean => {
  for (const key of Object.keys(a) as (keyof Selections)[]) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
};

const AlchemyUpgrade = () => {
  const selections = useUiPrefsStore((s) => s.alchemy.selections);
  const intervalMinutes = useUiPrefsStore((s) => s.alchemy.intervalMinutes);
  const setAlchemy = useUiPrefsStore((s) => s.setAlchemy);

  useEffect(() => {
    const sanitized = sanitizeSelections(selections);
    if (!selectionsEqual(sanitized, selections)) {
      setAlchemy({ selections: sanitized });
    }
    const clamped = clampInterval(intervalMinutes);
    if (clamped !== intervalMinutes) {
      setAlchemy({ intervalMinutes: clamped });
    }
  }, [selections, intervalMinutes, setAlchemy]);

  const hasAny = useMemo(
    () => Object.values(selections).some((v) => v !== null && v !== ""),
    [selections]
  );

  const setFor = (key: keyof Selections) => (raw: string) => {
    setAlchemy({
      selections: {
        ...selections,
        [key]: raw === NONE ? null : raw,
      },
    });
  };

  return (
    <ScriptPage
      actions={[
        {
          label: "Start Alchemy Upgrade",
          scriptId: "world2.alchemyUpgrade.run",
          runningLabel: "Upgrading... (Click to stop)",
          args: () => [selections, intervalMinutes],
          disabled: !hasAny || intervalMinutes < MIN_INTERVAL_MINUTES,
        },
      ]}
      title="Alchemy Upgrade"
    >
      <div className="mb-4 grid grid-cols-2 gap-4">
        {(Object.keys(BUBBLES_BY_CAULDRON) as (keyof Selections)[]).map(
          (key) => {
            const options = BUBBLES_BY_CAULDRON[key];
            const value = selections[key] ?? NONE;
            return (
              <div key={key}>
                <label
                  className="mb-1.5 block font-medium text-sm"
                  htmlFor={`cauldron-${key}`}
                >
                  {CAULDRON_LABELS[key]}
                </label>
                <Select onValueChange={setFor(key)} value={value}>
                  <SelectTrigger className="w-full" id={`cauldron-${key}`}>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }
        )}
      </div>

      <div className="mb-4">
        <label
          className="mb-1.5 block font-medium text-sm"
          htmlFor="alchemy-interval-minutes"
        >
          Run every (minutes)
        </label>
        <Input
          className="w-32"
          id="alchemy-interval-minutes"
          max={MAX_INTERVAL_MINUTES}
          min={MIN_INTERVAL_MINUTES}
          onChange={(e) =>
            setAlchemy({
              intervalMinutes: clampInterval(Number(e.target.value)),
            })
          }
          step={1}
          type="number"
          value={intervalMinutes}
        />
      </div>

      {!hasAny && (
        <p className="text-muted-foreground text-sm">
          Select at least one bubble to enable Start.
        </p>
      )}
    </ScriptPage>
  );
};

export default AlchemyUpgrade;
