import { useEffect, useMemo, useState } from "react";
import {
  Block,
  Field,
  RunBtn,
  TermInput,
  TermMultiSelect,
} from "@/components/terminal";
import { useMainState } from "@/hooks/use-main-state";
import { cn } from "@/lib/utils";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";
import type { Selections } from "@/types/alchemy";
import { BUBBLES_BY_CAULDRON, CAULDRON_LABELS } from "./bubble-registry";

const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 1440;
const ALCHEMY_SCRIPT_ID = "world2.alchemyUpgrade.run";

const formatCountdown = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

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

export const AlchemyUpgradeTab = () => {
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

  // Local draft for the interval input. Lets the user clear/edit freely
  // without the store stomping on partially-typed values; commits to the
  // store on every valid in-range edit, and clamps on blur.
  const [intervalDraft, setIntervalDraft] = useState(String(intervalMinutes));
  useEffect(() => {
    setIntervalDraft((prev) => {
      const parsed = Number.parseInt(prev, 10);
      return parsed === intervalMinutes ? prev : String(intervalMinutes);
    });
  }, [intervalMinutes]);

  const handleIntervalChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    setIntervalDraft(digits);
    if (digits === "") {
      return;
    }
    const parsed = Number.parseInt(digits, 10);
    if (
      Number.isFinite(parsed) &&
      parsed >= MIN_INTERVAL_MINUTES &&
      parsed <= MAX_INTERVAL_MINUTES
    ) {
      setAlchemy({ intervalMinutes: parsed });
    }
  };

  const handleIntervalBlur = () => {
    const parsed = Number.parseInt(intervalDraft, 10);
    const clamped = clampInterval(
      Number.isFinite(parsed) ? parsed : MIN_INTERVAL_MINUTES
    );
    setIntervalDraft(String(clamped));
    if (clamped !== intervalMinutes) {
      setAlchemy({ intervalMinutes: clamped });
    }
  };

  // The queue snapshot lives in the main process and is broadcast to any
  // mounted renderer, so `nextRunAt` survives page navigation - the user can
  // leave this page and come back and the countdown stays accurate.
  const queue = useMainState("queue");
  const queueItem = useMemo(() => {
    if (!queue) {
      return null;
    }
    if (queue.runningItem?.scriptId === ALCHEMY_SCRIPT_ID) {
      return queue.runningItem;
    }
    return (
      queue.queue.find(
        (i) => i.scriptId === ALCHEMY_SCRIPT_ID && i.status === "queued"
      ) ?? null
    );
  }, [queue]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!queueItem) {
      return;
    }
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [queueItem]);

  const isRunning = queueItem?.status === "running";
  const countdownLabel = (() => {
    if (!queueItem) {
      return "--";
    }
    if (isRunning) {
      return "running";
    }
    return formatCountdown(queueItem.nextRunAt - now);
  })();

  return (
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
            inputMode="numeric"
            maxLength={4}
            onBlur={handleIntervalBlur}
            onChange={handleIntervalChange}
            pattern="[0-9]*"
            type="text"
            value={intervalDraft}
          />
        </Field>
        <Field label="next run" width="w-[120px]">
          <div
            className={cn(
              "rounded-[3px] border border-border bg-surface px-2 py-[5px] font-mono text-[11px]",
              isRunning ? "text-amber" : "text-foreground"
            )}
          >
            {countdownLabel}
          </div>
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
  );
};
