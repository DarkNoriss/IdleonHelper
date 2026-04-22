import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AlertTone = "info" | "warn" | "danger";

type AlertProps = {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
};

const toneClasses: Record<AlertTone, string> = {
  info: "border-info/30 bg-info/[0.08] text-info",
  warn: "border-warn/30 bg-warn/[0.08] text-warn",
  danger: "border-destructive/30 bg-destructive/[0.08] text-destructive",
};

export const Alert = ({ tone = "info", children, className }: AlertProps) => (
  <div
    className={cn(
      "mb-2 rounded-[3px] border px-2.5 py-1.5 font-mono text-[10.5px] leading-[1.5]",
      toneClasses[tone],
      className
    )}
  >
    {children}
  </div>
);
