import { useState } from "react";
import { useTickingAge } from "@/hooks/use-ticking-age";
import { fmtAge } from "@/lib/format-age";
import { cn } from "@/lib/utils";
import { reopenConsentUrl, signInWithGoogle } from "@/providers/auth-provider";
import { useConnectionStore } from "@/store/connection";
import { GoogleG } from "./google-g-icon";
import { ProfileMenu } from "./profile-menu";

export const ProfileWidget = () => {
  const status = useConnectionStore((s) => s.status);
  const displayName = useConnectionStore((s) => s.displayName);
  const lastUpdated = useConnectionStore((s) => s.lastUpdated);
  const isStale = useConnectionStore((s) => s.isStale);
  const ageMs = useTickingAge(lastUpdated);
  const [open, setOpen] = useState(false);

  if (status === "idle" || status === "error") {
    return (
      <button
        className="flex h-[18px] cursor-pointer items-center gap-1.5 rounded-[3px] border border-border bg-surface px-2 font-medium font-mono text-[10px] text-foreground"
        onClick={() => {
          signInWithGoogle().catch(() => {
            // errors surface via the connection store
          });
        }}
        type="button"
      >
        <GoogleG />
        <span>sign in</span>
      </button>
    );
  }

  if (status === "connecting" || status === "awaiting-consent") {
    return (
      <button
        className="flex h-[18px] cursor-pointer items-center gap-1.5 rounded-[3px] border border-border bg-surface px-2 font-mono text-[10px] text-amber"
        onClick={() => reopenConsentUrl()}
        type="button"
      >
        <span className="inline-block h-1.5 w-1.5 animate-v3spin rounded-full border-[1.2px] border-amber border-t-transparent" />
        <span>
          {status === "awaiting-consent" ? "waiting for browser" : "connecting"}
        </span>
      </button>
    );
  }

  // connected | reconnecting
  const syncing = status === "reconnecting";
  return (
    <div className="relative">
      <button
        className={cn(
          "flex h-[18px] cursor-pointer items-center gap-[7px] rounded-[3px] border px-1.5 font-mono text-[10px] text-foreground",
          open
            ? "border-border bg-surface"
            : "border-transparent bg-transparent"
        )}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <Avatar
          initial={(displayName || "?").charAt(0).toUpperCase()}
          syncing={syncing}
        />
        <span className="font-medium text-foreground">
          {displayName ?? "user"}
        </span>
        <span className="text-text-muted">·</span>
        {syncing ? (
          <span className="inline-flex items-center gap-1 text-amber">
            <span className="inline-block h-1.5 w-1.5 animate-v3spin rounded-full border-[1.2px] border-amber border-t-transparent" />
            syncing
          </span>
        ) : (
          <span className={cn(isStale ? "text-text-muted" : "text-text-dim")}>
            {fmtAge(ageMs)}
          </span>
        )}
        <span className="ml-px text-[8px] text-text-muted">▾</span>
      </button>
      {open && <ProfileMenu onClose={() => setOpen(false)} syncing={syncing} />}
    </div>
  );
};

const Avatar = ({
  initial,
  syncing,
}: {
  initial: string;
  syncing: boolean;
}) => (
  <span className="relative inline-block">
    <span
      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full font-bold font-sans text-[#1a0e08] text-[9px]"
      style={{
        background: "linear-gradient(135deg, var(--primary), var(--amber))",
      }}
    >
      {initial}
    </span>
    {syncing && (
      <span className="absolute -inset-0.5 animate-v3spin rounded-full border-[1.2px] border-amber border-t-transparent" />
    )}
  </span>
);
