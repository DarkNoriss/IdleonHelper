import { useEffect, useEffectEvent, useRef, useState } from "react"
import { Check, Download, Loader2, RefreshCw, Rocket } from "lucide-react"

import { Button } from "./components/ui/button"
import { useUpdateStore } from "./stores/update"

export const UpdateStatus = (): React.ReactElement => {
  const {
    status: updateStatus,
    currentVersion,
    latestVersion,
    error: updateError,
    logs,
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
    clearLogs,
  } = useUpdateStore()

  const [showLogs, setShowLogs] = useState(false)

  const [showLatest, setShowLatest] = useState(false)
  const previousStatusRef = useRef<typeof updateStatus>(updateStatus)

  // Create stable event handlers using useEffectEvent
  const handleShowLatest = useEffectEvent(() => {
    setShowLatest(true)
  })

  const handleHideLatest = useEffectEvent(() => {
    setShowLatest(false)
  })

  // Handle showing "Latest" state after confirming up-to-date
  useEffect(() => {
    const previousStatus = previousStatusRef.current

    // Show "Latest" when transitioning from "checking" to "up-to-date" (both manual and automatic)
    if (previousStatus === "checking" && updateStatus === "up-to-date") {
      handleShowLatest()

      const hideTimer = setTimeout(() => {
        handleHideLatest()
      }, 30000) // 30 seconds

      previousStatusRef.current = updateStatus

      return () => {
        clearTimeout(hideTimer)
      }
    } else if (updateStatus !== "up-to-date") {
      handleHideLatest()
      previousStatusRef.current = updateStatus
      return undefined
    } else {
      previousStatusRef.current = updateStatus
      return undefined
    }
  }, [updateStatus])

  return (
    <div className="flex flex-col gap-1">
      {/* Current Version */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-xs">
          v{currentVersion}
        </span>
        {updateStatus !== "update-available" &&
          updateStatus !== "downloading" &&
          updateStatus !== "downloaded" && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 gap-1.5 px-2 text-xs transition-all duration-300 ${
                showLatest
                  ? "text-green-500 hover:text-green-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={checkForUpdates}
              disabled={updateStatus === "checking"}
            >
              {updateStatus === "checking" ? (
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

      {/* Update Available / Downloading / Downloaded */}
      {updateStatus === "update-available" && (
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
      {updateStatus === "downloading" && (
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
      {updateStatus === "downloaded" && (
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

      {/* Error Display */}
      {updateStatus === "error" && updateError && (
        <div className="bg-destructive/5 border-destructive/20 flex items-center justify-between rounded-md border px-2 py-1.5">
          <span className="text-destructive text-[11px] font-medium">
            Error: {updateError}
          </span>
        </div>
      )}

      {/* Debug Logs */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setShowLogs(!showLogs)}
          className="text-muted-foreground hover:text-foreground text-left text-[10px]"
        >
          {showLogs ? "Hide" : "Show"} Debug Logs ({logs.length})
        </button>
        {showLogs && logs.length > 0 && (
          <div className="bg-muted/50 border-muted max-h-32 overflow-y-auto rounded-md border p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-muted-foreground text-[10px] font-medium">
                Update Logs
              </span>
              <button
                type="button"
                onClick={clearLogs}
                className="text-muted-foreground hover:text-foreground text-[10px]"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="font-mono text-[10px] leading-tight"
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
