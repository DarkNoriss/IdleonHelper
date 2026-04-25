import { Dialog } from "@base-ui/react/dialog";
import { cancelSignIn } from "@/providers/auth-provider";
import { useConnectionStore } from "@/store/connection";

export const ConsentDialog = () => {
  const status = useConnectionStore((s) => s.status);
  const userCode = useConnectionStore((s) => s.userCode);
  const verificationUrl = useConnectionStore((s) => s.verificationUrl);

  const open =
    status === "awaiting-consent" &&
    userCode != null &&
    verificationUrl != null;

  const handleCopy = () => {
    if (userCode) {
      navigator.clipboard.writeText(userCode).catch(() => {
        // clipboard write may fail in restricted contexts; ignore
      });
    }
  };

  const handleCancel = () => {
    cancelSignIn().catch(() => {
      // errors surface via the connection store
    });
  };

  return (
    <Dialog.Root
      onOpenChange={(o) => {
        if (!o) {
          handleCancel();
        }
      }}
      open={open}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-[6px] border border-border bg-panel p-5 font-mono shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <Dialog.Title className="mb-2 font-medium text-[12px] text-foreground">
            <span className="text-primary">❯</span> sign in with google
          </Dialog.Title>
          <Dialog.Description className="mb-4 text-[10.5px] text-text-dim leading-[1.55]">
            to sign in with google, go to the following url and enter the code
            below to verify it is you
          </Dialog.Description>

          <div className="mb-3">
            <div className="mb-1 text-[9px] text-text-muted uppercase tracking-[1px]">
              url
            </div>
            <a
              className="break-all text-[11px] text-amber underline"
              href={verificationUrl ?? ""}
              rel="noopener noreferrer"
              target="_blank"
            >
              {verificationUrl}
            </a>
          </div>

          <div className="mb-4">
            <div className="mb-1 text-[9px] text-text-muted uppercase tracking-[1px]">
              code
            </div>
            <div className="flex items-center gap-2">
              <span className="select-all font-bold font-mono text-[20px] text-foreground tracking-[0.2em]">
                {userCode}
              </span>
              <button
                className="cursor-pointer rounded-[3px] border border-border bg-surface px-2 py-1 font-mono text-[9.5px] text-text-dim hover:bg-surface-hi"
                onClick={handleCopy}
                type="button"
              >
                copy
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className="cursor-pointer rounded-[3px] border border-border bg-surface px-3 py-1.5 font-mono text-[10.5px] text-text-dim hover:bg-surface-hi"
              onClick={handleCancel}
              type="button"
            >
              cancel
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
