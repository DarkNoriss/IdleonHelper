import { Popover } from "@base-ui/react/popover";
import { useId } from "react";
import { TermCheckbox } from "@/components/terminal/term-checkbox";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type TermMultiSelectProps = {
  options: readonly Option[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  placeholderAll?: string;
  className?: string;
};

// `value` is the list of currently-checked option ids. The component preserves
// option order in the array it returns from `onChange`, so callers can rely on
// stable equality checks across toggles.
export const TermMultiSelect = ({
  options,
  value,
  onChange,
  placeholderAll = "all",
  className,
}: TermMultiSelectProps) => {
  const headingId = useId();
  const checkedSet = new Set(value);
  const total = options.length;
  const checkedCount = options.reduce(
    (n, o) => n + (checkedSet.has(o.value) ? 1 : 0),
    0
  );

  const triggerLabel = (() => {
    if (checkedCount === total) {
      return <span>{placeholderAll}</span>;
    }
    if (checkedCount === 0) {
      return <span className="text-warn">none</span>;
    }
    if (checkedCount === 1) {
      const only = options.find((o) => checkedSet.has(o.value));
      return <span>{only?.label ?? ""}</span>;
    }
    return (
      <span>
        {checkedCount} of {total}
      </span>
    );
  })();

  const toggle = (id: string, next: boolean) => {
    if (next) {
      // Preserve option order in the emitted array.
      onChange(
        options
          .filter((o) => o.value === id || checkedSet.has(o.value))
          .map((o) => o.value)
      );
      return;
    }
    onChange(value.filter((v) => v !== id));
  };

  const setAll = () => onChange(options.map((o) => o.value));
  const setNone = () => onChange([]);
  const invert = () =>
    onChange(
      options.filter((o) => !checkedSet.has(o.value)).map((o) => o.value)
    );

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          "relative flex w-full cursor-pointer items-center justify-between rounded-[3px] border border-border bg-surface py-[5px] pr-[22px] pl-2 font-mono text-[11px] text-foreground outline-none",
          className
        )}
      >
        {triggerLabel}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[8px] text-text-muted"
        >
          ▾
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start" side="bottom" sideOffset={4}>
          <Popover.Popup
            aria-labelledby={headingId}
            className="z-40 min-w-[160px] rounded-[5px] border border-border bg-panel font-mono text-[11px] shadow-[0_8px_22px_rgba(0,0,0,0.55)]"
          >
            <span className="sr-only" id={headingId}>
              filter resources
            </span>
            <div className="flex flex-col gap-1.5 px-2.5 pt-2 pb-1.5">
              {options.map((o) => (
                <TermCheckbox
                  checked={checkedSet.has(o.value)}
                  className="py-[2px]"
                  key={o.value}
                  label={o.label}
                  onChange={(next) => toggle(o.value, next)}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 border-border border-t bg-panel-2 px-2 py-1">
              <button
                className="cursor-pointer rounded-[2px] px-1.5 py-[2px] text-[10px] text-text-dim hover:text-foreground"
                onClick={setAll}
                type="button"
              >
                all
              </button>
              <button
                className="cursor-pointer rounded-[2px] px-1.5 py-[2px] text-[10px] text-text-dim hover:text-foreground"
                onClick={setNone}
                type="button"
              >
                none
              </button>
              <button
                className="cursor-pointer rounded-[2px] px-1.5 py-[2px] text-[10px] text-text-dim hover:text-foreground"
                onClick={invert}
                type="button"
              >
                invert
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
