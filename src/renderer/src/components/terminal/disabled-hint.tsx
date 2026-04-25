import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactNode } from "react";

type DisabledHintProps = {
  disabled: boolean;
  popover: ReactNode;
  children: ReactNode;
};

// Wraps a disabled control and shows a yellow-bordered tooltip above it on
// hover, explaining why it is disabled. When `disabled=false`, renders
// children unchanged with zero overhead.
export const DisabledHint = ({
  disabled,
  popover,
  children,
}: DisabledHintProps) => {
  if (!disabled) {
    return <>{children}</>;
  }
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={<span className="relative inline-flex" />}>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner align="center" side="top" sideOffset={6}>
          <Tooltip.Popup className="z-40 min-w-[220px] max-w-[260px] rounded-[4px] border border-warn bg-panel px-2.5 py-[7px] font-mono text-[10px] text-foreground leading-[1.55] shadow-[0_8px_22px_rgba(0,0,0,0.55)]">
            <div className="mb-0.5 text-[9px] text-warn uppercase tracking-[1px]">
              disabled
            </div>
            <div className="text-text-dim">{popover}</div>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
