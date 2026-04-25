import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { ProfileWidget } from "@/components/profile/profile-widget";
import { useMainState } from "@/hooks/use-main-state";
import { cn } from "@/lib/utils";

const dragStyle: CSSProperties = { WebkitAppRegion: "drag" } as CSSProperties;
const noDragStyle: CSSProperties = {
  WebkitAppRegion: "no-drag",
} as CSSProperties;

export const TitleBar = () => {
  const backendStatus = useMainState("backendStatus");
  const status = backendStatus?.status ?? "connecting";
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  const pillLabel = isConnected
    ? "connected"
    : isConnecting
      ? "connecting"
      : "disconnected";
  const pillColor = isConnected
    ? "text-success"
    : isConnecting
      ? "text-warn"
      : "text-destructive";
  const dotClass = isConnected
    ? "bg-success shadow-[0_0_6px_var(--success)]"
    : isConnecting
      ? "bg-warn"
      : "bg-destructive";

  return (
    <header
      className="flex h-[26px] shrink-0 items-center justify-between border-border border-b bg-panel px-2 font-mono text-[10.5px] text-text-dim"
      style={dragStyle}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-primary">❯</span>
        <span className="font-medium text-foreground">idleon-helper</span>
        <span className={cn("flex items-center gap-1", pillColor)}>
          <span
            className={cn("inline-block h-1.5 w-1.5 rounded-full", dotClass)}
          />
          {pillLabel}
        </span>
      </div>
      <div className="flex items-center gap-1" style={noDragStyle}>
        <ProfileWidget />
        <span className="mx-1 inline-block h-3.5 w-px bg-border" />
        <WinBtn onClick={() => window.api.window.minimize()}>_</WinBtn>
        <WinBtn onClick={() => window.api.window.maximize()}>□</WinBtn>
        <WinBtn close onClick={() => window.api.window.close()}>
          ×
        </WinBtn>
      </div>
    </header>
  );
};

type WinBtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  close?: boolean;
};

const WinBtn = ({ close, className, children, ...rest }: WinBtnProps) => (
  <button
    className={cn(
      "h-[18px] w-[22px] cursor-pointer border-none bg-transparent font-mono text-[11px] transition-colors",
      close
        ? "text-primary hover:bg-destructive hover:text-primary-ink"
        : "text-text-dim hover:bg-surface",
      className
    )}
    type="button"
    {...rest}
  >
    {children}
  </button>
);
