import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TermInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> & {
  value: string;
  onChange: (v: string) => void;
};

export const TermInput = ({
  value,
  onChange,
  disabled,
  className,
  ...rest
}: TermInputProps) => (
  <input
    className={cn(
      "w-full rounded-[3px] border border-border bg-surface px-2 py-[5px] font-mono text-[11px] text-foreground outline-none",
      disabled && "opacity-60",
      className
    )}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value)}
    value={value}
    {...rest}
  />
);
