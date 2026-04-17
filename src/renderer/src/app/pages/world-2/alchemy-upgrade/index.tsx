import { useMemo, useState } from "react";
import { ScriptPage } from "@/components/script-page.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import type { Selections } from "@/types/alchemy";
import { BUBBLES_BY_CAULDRON, CAULDRON_LABELS } from "./bubble-registry";

const NONE = "__none__";
const DEFAULT_INTERVAL_MINUTES = 5;
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

const INITIAL: Selections = {
  power: null,
  quicc: null,
  highIq: null,
  kazam: null,
};

const AlchemyUpgrade = () => {
  const [selections, setSelections] = useState<Selections>(INITIAL);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(
    DEFAULT_INTERVAL_MINUTES
  );

  const hasAny = useMemo(
    () => Object.values(selections).some((v) => v !== null && v !== ""),
    [selections]
  );

  const setFor = (key: keyof Selections) => (raw: string) => {
    setSelections((prev) => ({
      ...prev,
      [key]: raw === NONE ? null : raw,
    }));
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
            setIntervalMinutes(clampInterval(Number(e.target.value)))
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
