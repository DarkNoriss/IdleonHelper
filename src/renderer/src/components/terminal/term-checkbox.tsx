import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TermCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  className?: string;
};

export const TermCheckbox = ({
  checked,
  onChange,
  label,
  disabled,
  className,
}: TermCheckboxProps) => (
  <label
    className={cn(
      "inline-flex select-none items-center gap-2 font-mono text-[11px] text-foreground",
      disabled ? "cursor-default opacity-60" : "cursor-pointer",
      className
    )}
  >
    <input
      checked={checked}
      className="sr-only"
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      type="checkbox"
    />
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-[14px] w-[14px] items-center justify-center rounded-sm border font-bold text-[10px] text-primary-ink",
        checked ? "border-primary bg-primary" : "border-border bg-surface"
      )}
    >
      {checked ? "✓" : ""}
    </span>
    {label}
  </label>
);
