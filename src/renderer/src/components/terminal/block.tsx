import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BlockProps = {
  title: string;
  tag?: string;
  dev?: boolean;
  note?: ReactNode;
  compact?: boolean;
  children: ReactNode;
  className?: string;
};

export const Block = ({
  title,
  tag,
  dev,
  note,
  compact,
  children,
  className,
}: BlockProps) => (
  <div
    className={cn(
      "mb-2.5 flex min-h-0 flex-col self-stretch rounded-[5px] border border-border bg-panel",
      className
    )}
  >
    <div className="flex shrink-0 items-center gap-2 border-border-soft border-b px-3 py-1.5 font-mono text-[10.5px]">
      <span className="text-primary">#</span>
      <span className="font-medium text-foreground tracking-[0.2px]">
        {title}
      </span>
      {tag && (
        <span className="rounded-sm border border-border-soft bg-surface px-1.5 text-[9px] text-text-dim">
          {tag}
        </span>
      )}
      {dev && (
        <span className="rounded-sm border border-border-soft px-[3px] text-[8px] text-warn tracking-[0.5px]">
          dev
        </span>
      )}
    </div>
    {note && (
      <div className="min-h-0 flex-1 border-border-soft border-b bg-panel-2 px-3 py-[7px] font-mono text-[10.5px] text-text-dim leading-[1.55]">
        <span className="text-amber">{"// "}</span>
        {note}
      </div>
    )}
    <div
      className={cn("flex shrink-0 flex-col", compact ? "px-3 py-2" : "p-3")}
    >
      {children}
    </div>
  </div>
);

type BlockActionsProps = {
  children: ReactNode;
  className?: string;
};

export const BlockActions = ({ children, className }: BlockActionsProps) => (
  <div className={cn("mt-auto pt-2.5", className)}>{children}</div>
);
