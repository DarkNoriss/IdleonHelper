import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  children: ReactNode;
  /**
   * Tailwind width utility applied to the wrapping div, e.g. `"w-[140px]"`,
   * `"w-1/2"`, `"w-full"`. Must be a literal class so the JIT scanner picks
   * it up — never an interpolated template string.
   */
  width?: string;
  hint?: ReactNode;
  className?: string;
};

export const Field = ({
  label,
  children,
  width,
  hint,
  className,
}: FieldProps) => (
  <div className={cn(width, className)}>
    <div className="mb-[3px] flex items-center justify-between">
      <span className="font-mono text-[10px] text-text-dim lowercase tracking-[0.3px]">{`--${label}`}</span>
      {hint && (
        <span className="font-mono text-[9px] text-text-muted">{hint}</span>
      )}
    </div>
    {children}
  </div>
);
