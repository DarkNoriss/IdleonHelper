import { useEffect, useMemo } from "react";
import {
  Block,
  Field,
  PageHead,
  RunBtn,
  TermInput,
  TermMultiSelect,
} from "@/components/terminal";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";
import type { Selections } from "@/types/alchemy";
import { BUBBLES_BY_CAULDRON, CAULDRON_LABELS } from "./bubble-registry";

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
  power: [],
  quicc: [],
  highIq: [],
  kazam: [],
};

// Legacy persisted shape was `string | null` per column. Coerce to `string[]`
// before validation so users with old localStorage state don't break.
const coerceColumn = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string" && v !== "");
  }
  if (typeof raw === "string" && raw !== "") {
    return [raw];
  }
  return [];
};

const sanitizeSelections = (selections: Selections): Selections => {
  const next: Selections = { ...INITIAL_SELECTIONS };
  for (const key of Object.keys(BUBBLES_BY_CAULDRON) as (keyof Selections)[]) {
    const valid = new Set(BUBBLES_BY_CAULDRON[key].map((o) => o.value));
    const coerced = coerceColumn((selections as Record<string, unknown>)[key]);
    next[key] = coerced.filter((v) => valid.has(v));
  }
  return next;
};

// Returns true iff every column in `raw` is already a `string[]` whose entries
// match `sanitized` exactly. Tolerates legacy persisted shapes (e.g. `null`,
// bare string) by treating any non-array column as a mismatch.
const matchesSanitized = (sanitized: Selections, raw: unknown): boolean => {
  if (!raw || typeof raw !== "object") {
    return false;
  }
  const r = raw as Record<string, unknown>;
  for (const key of Object.keys(sanitized) as (keyof Selections)[]) {
    const sv = sanitized[key];
    const rv = r[key];
    if (!Array.isArray(rv)) {
      return false;
    }
    if (rv.length !== sv.length) {
      return false;
    }
    for (let i = 0; i < sv.length; i++) {
      if (rv[i] !== sv[i]) {
        return false;
      }
    }
  }
  return true;
};

const AlchemyUpgrade = () => {
  const selections = useUiPrefsStore((s) => s.alchemy.selections);
  const intervalMinutes = useUiPrefsStore((s) => s.alchemy.intervalMinutes);
  const setAlchemy = useUiPrefsStore((s) => s.setAlchemy);

  // Render-time sanitization. Legacy persisted state may have
  // `selections.X: string | null` (pre-multi-select shape) so we always render
  // against a coerced + validated copy. The effect below persists this back to
  // the store on first mount.
  const sanitized = useMemo(() => sanitizeSelections(selections), [selections]);

  useEffect(() => {
    const clamped = clampInterval(intervalMinutes);
    const patch: Partial<{
      selections: Selections;
      intervalMinutes: number;
    }> = {};
    if (!matchesSanitized(sanitized, selections)) {
      patch.selections = sanitized;
    }
    if (clamped !== intervalMinutes) {
      patch.intervalMinutes = clamped;
    }
    if (Object.keys(patch).length > 0) {
      setAlchemy(patch);
    }
  }, [selections, sanitized, intervalMinutes, setAlchemy]);

  const totalSelected = useMemo(
    () => Object.values(sanitized).reduce((n, list) => n + list.length, 0),
    [sanitized]
  );

  const setColumn = (key: keyof Selections) => (next: string[]) => {
    setAlchemy({
      selections: {
        ...sanitized,
        [key]: next,
      },
    });
  };

  return (
    <>
      <PageHead path="world-2 / alchemy-upgrade" title="alchemy-upgrade" />
      <Block
        note="select one or more bubbles per cauldron. each selected bubble gets bursted in turn. matches are gated by column x-range so look-alike bubbles in other cauldrons don't get clicked."
        tag="config"
        title="alchemy.targets"
      >
        <div className="mb-2.5 grid grid-cols-2 gap-2">
          {(Object.keys(BUBBLES_BY_CAULDRON) as (keyof Selections)[]).map(
            (key) => (
              <Field key={key} label={CAULDRON_LABELS[key].toLowerCase()}>
                <TermMultiSelect
                  bulkActions={false}
                  onChange={setColumn(key)}
                  options={BUBBLES_BY_CAULDRON[key]}
                  placeholderAll="all bubbles"
                  placeholderNone="none"
                  searchable
                  searchPlaceholder="search bubbles"
                  value={sanitized[key]}
                />
              </Field>
            )
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
            disabled={
              totalSelected === 0 || intervalMinutes < MIN_INTERVAL_MINUTES
            }
            getArgs={() => [sanitized, intervalMinutes]}
            label="start alchemy"
            scriptId="world2.alchemyUpgrade.run"
          />
        </div>
        {totalSelected === 0 && (
          <div className="mt-2 font-mono text-[10px] text-text-muted">
            select at least one bubble to enable start.
          </div>
        )}
      </Block>
    </>
  );
};

export default AlchemyUpgrade;
