import type { CSSProperties } from "react";

type StatProps = {
  label: string;
  value: string;
  tone?: CSSProperties["color"];
};

export const Stat = ({ label, value, tone }: StatProps) => (
  <div className="rounded-[4px] border border-border bg-panel px-2.5 py-2 font-mono">
    <div className="text-[9px] text-text-muted uppercase tracking-[1px]">
      {label}
    </div>
    <div
      className="mt-0.5 font-medium text-[16px]"
      style={{ color: tone ?? "var(--foreground)" }}
    >
      {value}
    </div>
  </div>
);
