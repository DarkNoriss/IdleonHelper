import type { HsvColor } from "@/types/hsv";

type HsvRowProps = {
  label: string;
  value: HsvColor;
  onChange: (v: HsvColor) => void;
};

const keys = ["h", "s", "v"] as const;

export const HsvRow = ({ label, value, onChange }: HsvRowProps) => (
  <div>
    <div className="mb-1 font-mono text-[10px] text-text-dim tracking-[0.3px]">{`--${label}`}</div>
    <div className="flex gap-1">
      {keys.map((k) => (
        <div className="relative flex-1" key={k}>
          <span className="pointer-events-none absolute top-1/2 left-1.5 -translate-y-1/2 font-mono text-[9.5px] text-text-muted">
            {k}
          </span>
          <input
            className="w-full rounded-[3px] border border-border bg-surface py-[5px] pr-1.5 pl-[18px] font-mono text-[11px] text-foreground outline-none"
            onChange={(e) =>
              onChange({ ...value, [k]: Number(e.target.value) || 0 })
            }
            type="number"
            value={value[k]}
          />
        </div>
      ))}
    </div>
  </div>
);
