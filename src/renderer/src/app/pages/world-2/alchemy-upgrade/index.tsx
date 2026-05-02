import { useEffect, useMemo } from "react";
import {
  Block,
  Field,
  PageHead,
  RunBtn,
  TermInput,
  TermSelect,
} from "@/components/terminal";
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

const INITIAL_SELECTIONS: Selections = {
  power: null,
  quicc: null,
  highIq: null,
  kazam: null,
};

const sanitizeSelections = (selections: Selections): Selections => {
  const next: Selections = { ...INITIAL_SELECTIONS, ...selections };
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
    const clamped = clampInterval(intervalMinutes);
    const patch: Partial<{
      selections: Selections;
      intervalMinutes: number;
    }> = {};
    if (!selectionsEqual(sanitized, selections)) {
      patch.selections = sanitized;
    }
    if (clamped !== intervalMinutes) {
      patch.intervalMinutes = clamped;
    }
    if (Object.keys(patch).length > 0) {
      setAlchemy(patch);
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
    <>
      <PageHead path="world-2 / alchemy-upgrade" title="alchemy-upgrade" />
      <Block
        note="select the target bubble for each cauldron. leave a cauldron unset to skip it."
        tag="config"
        title="alchemy.targets"
      >
        <div className="mb-2.5 grid grid-cols-2 gap-2">
          {(Object.keys(BUBBLES_BY_CAULDRON) as (keyof Selections)[]).map(
            (key) => {
              const options = [
                { value: NONE, label: "none" },
                ...BUBBLES_BY_CAULDRON[key].map((o) => ({
                  value: o.value,
                  label: o.label,
                })),
              ];
              const value = selections[key] ?? NONE;
              return (
                <Field key={key} label={CAULDRON_LABELS[key].toLowerCase()}>
                  <TermSelect
                    onChange={setFor(key)}
                    options={options}
                    value={value}
                  />
                </Field>
              );
            }
          )}
        </div>
        <div className="flex items-end gap-2.5">
          <Field label="run every (minutes)" width="w-[160px]">
            <TermInput
              max={MAX_INTERVAL_MINUTES}
              min={MIN_INTERVAL_MINUTES}
              onChange={(v) =>
                setAlchemy({ intervalMinutes: clampInterval(Number(v)) })
              }
              step={1}
              type="number"
              value={String(intervalMinutes)}
            />
          </Field>
          <RunBtn
            disabled={!hasAny || intervalMinutes < MIN_INTERVAL_MINUTES}
            getArgs={() => [selections, intervalMinutes]}
            label="start alchemy"
            scriptId="world2.alchemyUpgrade.run"
          />
        </div>
        {!hasAny && (
          <div className="mt-2 font-mono text-[10px] text-text-muted">
            select at least one bubble to enable start.
          </div>
        )}
      </Block>
    </>
  );
};

export default AlchemyUpgrade;
