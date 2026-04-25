import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useRef, useState } from "react";
import { cancelSignIn } from "@/providers/auth-provider";
import { useConnectionStore } from "@/store/connection";

export const ConsentDialog = () => {
  const status = useConnectionStore((s) => s.status);
  const userCode = useConnectionStore((s) => s.userCode);
  const verificationUrl = useConnectionStore((s) => s.verificationUrl);
  const expiresAt = useConnectionStore((s) => s.expiresAt);

  const open =
    status === "awaiting-consent" &&
    userCode != null &&
    verificationUrl != null &&
    expiresAt != null;

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
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[380px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[6px] border border-border bg-panel font-mono shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
          {open &&
          expiresAt != null &&
          userCode != null &&
          verificationUrl != null ? (
            <ConsentDialogBody
              expiresAt={expiresAt}
              onCancel={handleCancel}
              userCode={userCode}
              verificationUrl={verificationUrl}
            />
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

type BodyProps = {
  userCode: string;
  verificationUrl: string;
  expiresAt: number;
  onCancel: () => void;
};

const ConsentDialogBody = ({
  userCode,
  verificationUrl,
  expiresAt,
  onCancel,
}: BodyProps) => {
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  );

  useEffect(() => {
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    },
    []
  );

  const writeClipboard = async (): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(userCode);
        return true;
      }
    } catch {
      // fall through to legacy path
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = userCode;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const flashCopied = () => {
    setCopied(true);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    // revert after 5s in case the OS clipboard didn't actually receive it
    copyTimerRef.current = setTimeout(() => setCopied(false), 5000);
  };

  const onCopy = async () => {
    if (copied) {
      return;
    }
    await writeClipboard();
    flashCopied();
  };

  const onOpenAndCopy = async () => {
    // open synchronously inside the click handler so popup-blocker
    // heuristics in any future browser embed stay happy
    window.open(verificationUrl, "_blank", "noopener,noreferrer");
    setOpened(true);
    if (!copied) {
      await writeClipboard();
      flashCopied();
    }
  };

  const selectAllCode = (e: React.MouseEvent<HTMLButtonElement>) => {
    const range = document.createRange();
    range.selectNodeContents(e.currentTarget);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");
  const expiringSoon = secondsLeft < 60;

  return (
    <>
      {/* title strip */}
      <div className="flex h-6 items-center justify-between border-border border-b bg-panel-2 px-2 text-[10px] text-text-dim">
        <Dialog.Title className="flex items-center gap-1.5 font-medium text-foreground">
          <span className="text-primary">❯</span>
          <span>sign in with google</span>
        </Dialog.Title>
        <button
          aria-label="close"
          className="cursor-pointer border-none bg-transparent px-1 text-[13px] text-text-dim leading-none hover:text-foreground"
          onClick={onCancel}
          type="button"
        >
          ×
        </button>
      </div>

      <div className="px-[18px] pt-4 pb-[14px]">
        <Dialog.Description className="mb-3 text-[11px] text-text-dim leading-[1.55]">
          to verify it's you, open{" "}
          <span className="text-foreground">google.com/device</span> and enter
          this code:
        </Dialog.Description>

        {/* code panel */}
        <div className="mb-2.5 flex items-center justify-between rounded-[4px] border border-border bg-background px-3 py-3.5">
          <button
            aria-label={`select code ${userCode}`}
            className="cursor-text select-all border-none bg-transparent p-0 text-left font-mono font-semibold text-[22px] text-primary tracking-[3px]"
            onClick={selectAllCode}
            type="button"
          >
            {userCode}
          </button>
          <button
            className={
              copied
                ? "flex h-6 cursor-default items-center gap-1.5 rounded-[3px] border border-success bg-success/10 px-2 font-medium font-mono text-[10px] text-success transition-colors"
                : "flex h-6 cursor-pointer items-center gap-1.5 rounded-[3px] border border-border bg-surface px-2 font-medium font-mono text-[10px] text-foreground transition-colors hover:bg-surface-hi"
            }
            disabled={copied}
            onClick={onCopy}
            type="button"
          >
            {copied ? (
              <>
                <CheckIcon />
                <span>copied</span>
              </>
            ) : (
              <>
                <CopyIcon />
                <span>copy</span>
              </>
            )}
          </button>
        </div>

        {/* expiry meta row */}
        <div className="mb-3.5 flex items-center justify-between text-[9.5px] text-text-muted">
          <span>
            code expires in{" "}
            <span
              className={expiringSoon ? "text-destructive" : "text-text-dim"}
            >
              {mm}:{ss}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-primary">
            <span
              aria-hidden
              className="inline-block size-1.5 animate-v3spin rounded-full border-[1.2px] border-primary border-t-transparent"
            />
            waiting for verification
          </span>
        </div>

        {/* primary CTA */}
        <button
          className="mb-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[3px] border-none bg-primary px-3 py-2 font-mono font-semibold text-[11px] text-primary-ink hover:bg-primary-hover"
          onClick={onOpenAndCopy}
          type="button"
        >
          <GoogleG />
          <span>
            {opened
              ? "reopen verification page"
              : "open verification page & copy code"}
          </span>
          <span aria-hidden className="opacity-70">
            ↗
          </span>
        </button>

        {/* helper line */}
        <div className="text-center text-[9.5px] text-text-muted leading-[1.55]">
          {opened
            ? "switch to the new tab → paste the code → approve."
            : "we'll open google in a new tab and copy the code for you."}
        </div>
      </div>
    </>
  );
};

const CopyIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="10"
    viewBox="0 0 16 16"
    width="10"
  >
    <rect
      height="9"
      rx="1.2"
      stroke="currentColor"
      strokeWidth="1.3"
      width="8"
      x="4.5"
      y="4.5"
    />
    <path
      d="M3.5 11.5V3.5a1 1 0 0 1 1-1h7"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.3"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="11"
    viewBox="0 0 16 16"
    width="11"
  >
    <path
      d="M3.5 8.5l3 3 6-6.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

const GoogleG = () => (
  <svg aria-hidden="true" height="13" viewBox="0 0 24 24" width="13">
    <path
      d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.232c1.89-1.74 2.981-4.302 2.981-7.351z"
      fill="#4285F4"
    />
    <path
      d="M12 22c2.7 0 4.964-.895 6.619-2.422l-3.232-2.51c-.895.6-2.04.955-3.387.955-2.605 0-4.81-1.76-5.595-4.123H3.064v2.59A9.997 9.997 0 0 0 12 22z"
      fill="#34A853"
    />
    <path
      d="M6.405 13.9a6.005 6.005 0 0 1 0-3.8V7.51H3.064a10.003 10.003 0 0 0 0 8.98l3.341-2.59z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.96 3.027 14.696 2 12 2 8.097 2 4.733 4.24 3.064 7.51l3.341 2.59C7.19 7.737 9.395 5.977 12 5.977z"
      fill="#EA4335"
    />
  </svg>
);
