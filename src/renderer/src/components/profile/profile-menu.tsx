import { useTickingAge } from "@/hooks/use-ticking-age";
import { fmtAge } from "@/lib/format-age";
import { signOutFromGoogle } from "@/providers/auth-provider";
import { useConnectionStore } from "@/store/connection";

type ProfileMenuProps = {
  onClose: () => void;
  syncing: boolean;
};

export const ProfileMenu = ({ onClose, syncing }: ProfileMenuProps) => {
  const displayName = useConnectionStore((s) => s.displayName);
  const email = useConnectionStore((s) => s.email);
  const lastUpdated = useConnectionStore((s) => s.lastUpdated);
  const ageMs = useTickingAge(lastUpdated);

  const handleSignOut = async () => {
    onClose();
    await signOutFromGoogle();
  };

  return (
    <>
      {/* click-outside scrim */}
      <button
        aria-label="close profile menu"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onClick={onClose}
        type="button"
      />
      <div className="absolute top-[22px] right-0 z-50 w-[240px] rounded-[4px] border border-border bg-panel font-mono shadow-[0_10px_30px_rgba(0,0,0,0.55)]">
        {/* identity */}
        <div className="flex items-center gap-[9px] border-border-soft border-b px-3 py-2.5">
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold font-sans text-[#1a0e08] text-[13px]"
            style={{
              background:
                "linear-gradient(135deg, var(--primary), var(--amber))",
            }}
          >
            {(displayName || "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-[11px] text-foreground">
              {displayName ?? "user"}
            </div>
            <div className="truncate text-[9.5px] text-text-muted">
              {email ?? ""}
            </div>
          </div>
        </div>

        {/* sync status */}
        <div className="border-border-soft border-b px-3 py-[9px]">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] text-text-muted uppercase tracking-[1px]">
              data sync
            </span>
            {syncing ? (
              <span className="inline-flex items-center gap-1 text-[9.5px] text-amber">
                <span className="inline-block h-1.5 w-1.5 animate-v3spin rounded-full border-[1.2px] border-amber border-t-transparent" />
                syncing
              </span>
            ) : (
              <span className="text-[9.5px] text-success">● live</span>
            )}
          </div>
          <div className="text-[10px] text-text-dim leading-[1.55]">
            last updated{" "}
            <span className="text-foreground">{fmtAge(ageMs)}</span>
          </div>
        </div>

        {/* sign out */}
        <button
          className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3 py-2 text-left font-mono text-[10.5px] text-text-dim hover:bg-surface"
          onClick={() =>
            handleSignOut().catch(() => {
              /* sign-out is best-effort */
            })
          }
          type="button"
        >
          <span className="text-text-muted">↗</span>
          sign out
        </button>
      </div>
    </>
  );
};
