import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TermTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value"
> & {
  value: string;
  onChange: (v: string) => void;
};

export const TermTextarea = ({
  value,
  onChange,
  disabled,
  className,
  ...rest
}: TermTextareaProps) => (
  <textarea
    className={cn(
      "w-full resize-none rounded-[3px] border border-border bg-surface p-2 font-mono text-[10.5px] text-foreground outline-none",
      disabled && "opacity-60",
      className
    )}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value)}
    value={value}
    {...rest}
  />
);
