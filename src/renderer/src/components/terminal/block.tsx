import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BlockProps = {
  title: string;
  tag?: string;
  dev?: boolean;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
};

export const Block = ({
  title,
  tag,
  dev,
  note,
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
      className={cn(
        // Without a note, give the body the leftover height so `BlockActions`
        // (`mt-auto`) can pin its action to the bottom of a stretched block —
        // otherwise empty space sits between content and the block's edge
        // (e.g. the weekly-battle skull/trophy cards).
        "flex flex-col px-3 py-2",
        note ? "shrink-0" : "min-h-0 flex-1"
      )}
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
  // `first:pt-0` drops the top separator when BlockActions is the only child
  // of the Block body — the note already provides visual separation, and the
  // extra padding looks like a bug when nothing sits above it.
  <div className={cn("mt-auto pt-2.5 first:pt-0", className)}>{children}</div>
);
