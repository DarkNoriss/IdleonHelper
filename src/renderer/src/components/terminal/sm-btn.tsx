import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SmBtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
};

export const SmBtn = ({
  primary,
  className,
  children,
  ...rest
}: SmBtnProps) => (
  <button
    className={cn(
      "cursor-pointer rounded-[3px] border px-2.5 py-1 font-medium font-mono text-[10.5px] transition-colors disabled:cursor-default disabled:opacity-60",
      primary
        ? "border-primary bg-primary text-primary-ink hover:bg-primary-hover"
        : "border-border bg-surface text-foreground hover:bg-surface-hi",
      className
    )}
    type="button"
    {...rest}
  >
    {children}
  </button>
);
