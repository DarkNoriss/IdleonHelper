import type { ButtonHTMLAttributes } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type UpdateStatus =
  | "idle"
  | "checking"
  | "update-available"
  | "update-not-available"
  | "downloading"
  | "update-downloaded"
  | "installing"
  | "error";

type UpdateInfo = {
  version: string;
  status: UpdateStatus;
  error?: string;
};

type DownloadProgress = {
  percent: number;
  transferred: number;
  total: number;
};

export const UpdateFooter = () => {
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    version: "",
    status: "idle",
  });
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  useEffect(() => {
    window.api.update
      .getVersion()
      .then(setCurrentVersion)
      .catch(() => {
        // ignore
      });

    window.api.update
      .getStatus()
      .then((status) => setUpdateInfo(status as UpdateInfo))
      .catch(() => {
        // ignore
      });

    const cleanupStatus = window.api.update.onStatusChange((status) => {
      setUpdateInfo(status as UpdateInfo);
      if (status.status !== "downloading") {
        setProgress(null);
      }
    });
    const cleanupProgress = window.api.update.onDownloadProgress(setProgress);
    return () => {
      cleanupStatus();
      cleanupProgress();
    };
  }, []);

  const check = () => {
    window.api.update.checkForUpdates().catch(() => {
      // error surfaces via onStatusChange
    });
  };

  const download = () => {
    window.api.update.downloadUpdate().catch(() => {
      // error surfaces via onStatusChange
    });
  };

  const install = () => {
    try {
      window.api.update.installUpdate();
    } catch {
      // error surfaces via onStatusChange
    }
  };

  const status = updateInfo.status;
  const latest = updateInfo.version || currentVersion;

  const VerCurrent = (
    <span className="text-text-dim">v{currentVersion || "0.0.0"}</span>
  );

  let left: React.ReactNode = null;
  let right: React.ReactNode = null;

  if (status === "idle") {
    left = VerCurrent;
    right = <FootBtn onClick={check}>↻ check</FootBtn>;
  } else if (status === "checking") {
    left = VerCurrent;
    right = (
      <div className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 animate-v3spin rounded-full border-[1.5px] border-amber border-t-transparent" />
        <span className="text-amber">checking…</span>
      </div>
    );
  } else if (status === "update-not-available") {
    left = VerCurrent;
    right = (
      <span className="whitespace-nowrap text-success">✓ up to date</span>
    );
  } else if (status === "update-available") {
    left = (
      <div className="flex min-w-0 items-center gap-1.5">
        {VerCurrent}
        <span className="text-text-muted">→</span>
        <span className="font-medium text-amber">v{latest}</span>
        <span className="truncate text-[9px] text-text-muted">available</span>
      </div>
    );
    right = (
      <FootBtn onClick={download} primary>
        ↓ update
      </FootBtn>
    );
  } else if (status === "downloading") {
    const percent = Math.round(progress?.percent ?? 0);
    left = (
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1.5">
          {VerCurrent}
          <span className="text-text-muted">→</span>
          <span className="text-amber">v{latest}</span>
          <span className="ml-auto text-[9px] text-text-muted">{percent}%</span>
        </div>
        <div className="h-0.5 overflow-hidden rounded-[1px] bg-surface">
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  } else if (status === "update-downloaded" || status === "installing") {
    left = (
      <span className="whitespace-nowrap font-medium text-success">
        v{latest} ready
      </span>
    );
    right = (
      <FootBtn disabled={status === "installing"} onClick={install} primary>
        {status === "installing" ? "…" : "restart"}
      </FootBtn>
    );
  } else if (status === "error") {
    left = (
      <span className="truncate text-destructive">
        {updateInfo.error || "update error"}
      </span>
    );
    right = <FootBtn onClick={check}>↻ retry</FootBtn>;
  }

  return (
    <div className="flex min-h-[26px] items-center justify-between gap-2 border-border-soft border-t px-2.5 py-1.5 font-mono text-[9.5px] text-text-muted">
      <div className="flex min-w-0 flex-1 items-center">{left}</div>
      {right}
    </div>
  );
};

type FootBtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
};

const FootBtn = ({ primary, className, children, ...rest }: FootBtnProps) => (
  <button
    className={cn(
      "shrink-0 cursor-pointer rounded-[3px] border px-2 py-0.5 font-mono text-[9.5px] disabled:cursor-default disabled:opacity-60",
      primary
        ? "border-transparent bg-primary font-semibold text-primary-ink hover:bg-primary-hover"
        : "border-border bg-transparent text-text-dim hover:bg-surface",
      className
    )}
    type="button"
    {...rest}
  >
    {children}
  </button>
);
