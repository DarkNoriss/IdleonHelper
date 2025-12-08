import { useEffect, useEffectEvent, useRef, useState } from "react"
import { Check, Download, Loader2, RefreshCw, Rocket } from "lucide-react"

import { Button } from "./components/ui/button"
import { useUpdateStore } from "./stores/update"

export const UpdateStatus = (): React.ReactElement => {
  const {
    status,
    currentVersion,
    latestVersion,
    error,
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
  } = useUpdateStore()

  const [showLatest, setShowLatest] = useState(false)
  const prevStatusRef = useRef(status)

  // Effect events for state updates - avoids lint errors about setState in effects
  const onBecameLatest = useEffectEvent(() => {
    setShowLatest(true)
  })

  const onHideLatest = useEffectEvent(() => {
    setShowLatest(false)
  })

  // Show "Latest" badge briefly after confirming up-to-date
  useEffect(() => {
    const wasChecking = prevStatusRef.current === "checking"
    const isNowUpToDate = status === "up-to-date"
    prevStatusRef.current = status

    if (wasChecking && isNowUpToDate) {
      onBecameLatest()
      const timer = setTimeout(onHideLatest, 30000)
      return () => clearTimeout(timer)
    }

    if (status !== "up-to-date") {
      onHideLatest()
    }

    return
  }, [status])

  const isChecking = status === "checking"
  const showCheckButton = ![
    "update-available",
    "downloading",
    "downloaded",
  ].includes(status)

  return (
    <div className="flex flex-col gap-1">
      {/* Current Version */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-xs">
          v{currentVersion}
        </span>
        {showCheckButton && (
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 gap-1.5 px-2 text-xs transition-all duration-300 ${
              showLatest
                ? "text-green-500 hover:text-green-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={checkForUpdates}
            disabled={isChecking}
          >
            {isChecking ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Checking...</span>
              </>
            ) : showLatest ? (
              <>
                <Check className="animate-in fade-in zoom-in-95 h-3 w-3 duration-300" />
                <span className="animate-in fade-in zoom-in-95 duration-300">
                  Latest
                </span>
              </>
            ) : (
              <>
                <RefreshCw className="animate-in fade-in zoom-in-95 h-3 w-3 duration-300" />
                <span className="animate-in fade-in zoom-in-95 duration-300">
                  Check
                </span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Update Available */}
      {status === "update-available" && (
        <div className="flex items-center justify-between rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1.5">
          <span className="text-[11px] font-medium text-blue-400">
            v{latestVersion} available
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1.5 px-2 text-xs text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
            onClick={downloadUpdate}
          >
            <Download className="h-3 w-3" />
            <span>Update</span>
          </Button>
        </div>
      )}

      {/* Downloading */}
      {status === "downloading" && (
        <div className="flex items-center justify-between rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1.5">
          <span className="text-[11px] font-medium text-blue-400">
            v{latestVersion} available
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1.5 px-2 text-xs text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
            disabled
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Downloading...</span>
          </Button>
        </div>
      )}

      {/* Downloaded */}
      {status === "downloaded" && (
        <div className="flex items-center justify-between rounded-md border border-green-500/20 bg-green-500/10 px-2 py-1.5">
          <span className="text-[11px] font-medium text-green-400">
            Ready to install
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1.5 px-2 text-xs text-green-400 hover:bg-green-500/10 hover:text-green-300"
            onClick={quitAndInstall}
          >
            <Rocket className="h-3 w-3" />
            <span>Install</span>
          </Button>
        </div>
      )}

      {/* Error */}
      {status === "error" && error && (
        <div className="bg-destructive/5 border-destructive/20 flex items-center justify-between rounded-md border px-2 py-1.5">
          <span className="text-destructive text-[11px] font-medium">
            Error: {error}
          </span>
        </div>
      )}
    </div>
  )
}
