import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useState } from "react";
import { formatShorthandNumber, parseShorthandNumber } from "./parse-shorthand";

export type RphResource = { id: string; label: string };
export type RphRates = Record<string, number>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resources: readonly RphResource[];
  rates: RphRates;
  onSave: (rates: RphRates) => void;
};

export function OptimizerRphDialog({
  open,
  onOpenChange,
  resources,
  rates,
  onSave,
}: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      return;
    }
    const next: Record<string, string> = {};
    for (const r of resources) {
      next[r.id] = formatShorthandNumber(rates[r.id] ?? 1);
    }
    setDrafts(next);
  }, [open, resources, rates]);

  const handleSave = () => {
    const next: RphRates = {};
    for (const r of resources) {
      const parsed = parseShorthandNumber(drafts[r.id] ?? "1");
      next[r.id] = Number.isFinite(parsed) ? parsed : 1;
    }
    onSave(next);
    onOpenChange(false);
  };

  // Reformat a single field on blur: parse → format-with-commas. Keeps user
  // input freeform while typing (so they can paste "1.5k" or "754t") but
  // normalizes display once they tab away.
  const handleBlur = (id: string) => {
    setDrafts((d) => {
      const raw = d[id] ?? "";
      const parsed = parseShorthandNumber(raw);
      if (!Number.isFinite(parsed)) {
        return d;
      }
      return { ...d, [id]: formatShorthandNumber(parsed) };
    });
  };

  const resetAll = () => {
    const next: Record<string, string> = {};
    for (const r of resources) {
      next[r.id] = "1";
    }
    setDrafts(next);
  };

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[6px] border border-border bg-panel font-mono shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
          <div className="flex h-6 items-center justify-between border-border border-b bg-panel-2 px-2 text-[10px] text-text-dim">
            <Dialog.Title className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="text-primary">❯</span>
              <span>set rate per hour</span>
            </Dialog.Title>
            <button
              aria-label="close"
              className="cursor-pointer border-none bg-transparent px-1 text-[13px] text-text-dim leading-none hover:text-foreground"
              onClick={() => onOpenChange(false)}
              type="button"
            >
              ×
            </button>
          </div>

          <div className="px-[18px] pt-3 pb-[14px]">
            <Dialog.Description className="mb-3 text-[11px] text-text-dim leading-[1.55]">
              accepts 754t, 1.5k, 2m, 0.5b, 12q — or comma-formatted like
              754,000,000,000,000. setting a rate to 0 hides upgrades costing
              that resource.
            </Dialog.Description>

            <div className="my-3 flex flex-col gap-2">
              {resources.map((r) => (
                <label
                  className="flex items-center gap-2 text-[11px]"
                  key={r.id}
                >
                  <span className="w-24 text-text-dim">{r.label}</span>
                  <input
                    className="flex-1 rounded-[3px] border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground outline-none focus:border-primary"
                    onBlur={() => handleBlur(r.id)}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [r.id]: e.target.value }))
                    }
                    value={drafts[r.id] ?? ""}
                  />
                  <span className="text-[10px] text-text-muted">/hr</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                className="cursor-pointer rounded-[3px] border border-border bg-surface px-2 py-1 font-mono text-[10px] text-foreground hover:bg-surface-hi"
                onClick={resetAll}
                type="button"
              >
                reset all to 1/hr
              </button>
              <div className="flex items-center gap-2">
                <button
                  className="cursor-pointer rounded-[3px] border border-border bg-surface px-3 py-1 font-mono text-[10px] text-foreground hover:bg-surface-hi"
                  onClick={() => onOpenChange(false)}
                  type="button"
                >
                  cancel
                </button>
                <button
                  className="cursor-pointer rounded-[3px] border-none bg-primary px-3 py-1 font-mono font-semibold text-[10px] text-primary-ink hover:bg-primary-hover"
                  onClick={handleSave}
                  type="button"
                >
                  save
                </button>
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
