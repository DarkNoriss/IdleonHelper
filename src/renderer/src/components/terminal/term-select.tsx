import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Option = string | { value: string; label: string };

type TermSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "value"
> & {
  value: string;
  onChange: (v: string) => void;
  options: readonly Option[];
};

export const TermSelect = ({
  value,
  onChange,
  options,
  disabled,
  className,
  ...rest
}: TermSelectProps) => (
  <div className="relative">
    <select
      className={cn(
        "w-full appearance-none rounded-[3px] border border-border py-[5px] pr-[22px] pl-2 font-mono text-[11px] outline-none",
        disabled
          ? "cursor-default bg-panel text-text-muted opacity-60"
          : "cursor-pointer bg-surface text-foreground",
        className
      )}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      value={value}
      {...rest}
    >
      {options.map((o) => {
        const [val, label] =
          typeof o === "string" ? [o, o] : [o.value, o.label];
        return (
          <option className="bg-surface" key={val} value={val}>
            {label}
          </option>
        );
      })}
    </select>
    <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[8px] text-text-muted">
      ▾
    </span>
  </div>
);
