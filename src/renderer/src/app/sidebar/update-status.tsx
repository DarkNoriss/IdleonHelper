import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Download, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

type UpdateStatus =
  | "idle"
  | "checking"
  | "update-available"
  | "update-not-available"
  | "downloading"
  | "update-downloaded"
  | "error"

type UpdateInfo = {
  version: string
  status: UpdateStatus
  error?: string
}

type DownloadProgress = {
  percent: number
  transferred: number
  total: number
}

export const UpdateStatus = () => {
  const [currentVersion, setCurrentVersion] = useState<string>("")
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    version: "",
    status: "idle",
  })
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null)

  useEffect(() => {
    // Get current version
    window.api.update
      .getVersion()
      .then((version) => {
        setCurrentVersion(version)
      })
      .catch(() => {
        // Silently handle errors
      })

    // Get initial status
    window.api.update
      .getStatus()
      .then((status) => {
        setUpdateInfo(status as UpdateInfo)
      })
      .catch(() => {
        // Silently handle errors
      })

    // Listen for status changes
    const cleanupStatus = window.api.update.onStatusChange((status) => {
      setUpdateInfo(status as UpdateInfo)
      if (status.status !== "downloading") {
        setDownloadProgress(null)
      }
    })

    // Listen for download progress
    const cleanupProgress = window.api.update.onDownloadProgress((progress) => {
      setDownloadProgress(progress)
    })

    return () => {
      cleanupStatus()
      cleanupProgress()
    }
  }, [])

  const handleCheckUpdates = async () => {
    try {
      await window.api.update.checkForUpdates()
    } catch (error) {
      console.error("Failed to check for updates:", error)
    }
  }

  const handleDownload = async () => {
    try {
      await window.api.update.downloadUpdate()
    } catch (error) {
      console.error("Failed to download update:", error)
    }
  }

  const handleInstall = () => {
    try {
      window.api.update.installUpdate()
    } catch (error) {
      console.error("Failed to install update:", error)
    }
  }

  const isChecking = updateInfo.status === "checking"
  const isUpdateAvailable = updateInfo.status === "update-available"
  const isDownloading = updateInfo.status === "downloading"
  const isDownloaded = updateInfo.status === "update-downloaded"
  const isError = updateInfo.status === "error"
  const isNotAvailable = updateInfo.status === "update-not-available"

  return (
    <div className="border-sidebar-border mb-2 flex flex-col gap-2 border-b pb-2">
      {/* Version Display */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          Version {currentVersion || "..."}
        </span>
        {!isChecking && !isDownloading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCheckUpdates}
            className="h-6 px-2 text-xs"
            disabled={isDownloaded}
          >
            <RefreshCw className="h-3 w-3" />
            Check Updates
          </Button>
        )}
      </div>

      {/* Update Status Messages */}
      {isChecking && (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Checking for updates...</span>
        </div>
      )}

      {isUpdateAvailable && (
        <div className="flex flex-col gap-2">
          <div className="text-foreground flex items-center gap-2 text-xs">
            <AlertCircle className="h-3 w-3 text-blue-500" />
            <span>New version {updateInfo.version} available</span>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleDownload}
            className="h-7 text-xs"
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
        </div>
      )}

      {isDownloading && (
        <div className="flex flex-col gap-2">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Download className="h-3 w-3 animate-pulse" />
            <span>
              Downloading update...
              {downloadProgress && ` ${downloadProgress.percent}%`}
            </span>
          </div>
          {downloadProgress && (
            <div className="bg-sidebar-accent h-1 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${downloadProgress.percent}%` }}
              />
            </div>
          )}
        </div>
      )}

      {isDownloaded && (
        <div className="flex flex-col gap-2">
          <div className="text-foreground flex items-center gap-2 text-xs">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span>Update ready to install</span>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleInstall}
            className="h-7 text-xs"
          >
            Install & Restart
          </Button>
        </div>
      )}

      {isError && (
        <div className="flex flex-col gap-2">
          <div className="text-destructive flex items-center gap-2 text-xs">
            <AlertCircle className="h-3 w-3" />
            <span>{updateInfo.error || "Update error occurred"}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckUpdates}
            className="h-7 text-xs"
          >
            Retry
          </Button>
        </div>
      )}

      {isNotAvailable && (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <CheckCircle2 className="h-3 w-3" />
          <span>You're on the latest version</span>
        </div>
      )}
    </div>
  )
}
