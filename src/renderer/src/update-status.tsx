import { useEffect, useEffectEvent, useRef, useState } from "react"
import { CheckCircle, Download, Loader2, RefreshCw } from "lucide-react"

import { Button } from "./components/ui/button"
import { useUpdateStore } from "./stores/update"

export const UpdateStatus = (): React.ReactElement => {
  const {
    status: updateStatus,
    currentVersion,
    latestVersion,
    error: updateError,
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
  } = useUpdateStore()

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
                  <CheckCircle className="animate-in fade-in zoom-in-95 h-3 w-3 duration-300" />
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
      {(updateStatus === "update-available" ||
        updateStatus === "downloading" ||
        updateStatus === "downloaded") && (
        <div className="bg-primary/5 border-primary/20 flex items-center justify-between rounded-md border px-2 py-1.5">
          <span className="text-primary text-[11px] font-medium">
            v{latestVersion} available
          </span>
          {updateStatus === "downloading" ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-primary hover:text-primary hover:bg-primary/10 h-6 gap-1.5 px-2 text-xs"
              disabled
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Downloading...</span>
            </Button>
          ) : updateStatus === "downloaded" ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-primary hover:text-primary hover:bg-primary/10 h-6 gap-1.5 px-2 text-xs"
              onClick={quitAndInstall}
            >
              <CheckCircle className="h-3 w-3" />
              <span>Install</span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="text-primary hover:text-primary hover:bg-primary/10 h-6 gap-1.5 px-2 text-xs"
              onClick={downloadUpdate}
            >
              <Download className="h-3 w-3" />
              <span>Update</span>
            </Button>
          )}
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
    </div>
  )
}
