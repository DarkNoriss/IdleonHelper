import { useEffect, useState } from "react"
import { Wifi, WifiOff } from "lucide-react"

type ConnectionStatus = "connecting" | "connected" | "error"

type BackendStatus = {
  status: ConnectionStatus
  error: string | null
}

export const SidebarBackendStatus = () => {
  const [status, setStatus] = useState<BackendStatus>({
    status: "connecting",
    error: null,
  })

  useEffect(() => {
    // Request current status immediately (handles case where connection completed before component mounted)
    window.api.backend.getStatus().then((currentStatus) => {
      setStatus(currentStatus)
    }).catch(() => {
      // Silently handle errors - component will show "connecting" state
    })
    
    // Listen for status changes from backend
    const cleanup = window.api.backend.onStatusChange((newStatus) => {
      setStatus(newStatus)
    })

    return cleanup
  }, [])

  const isConnected = status.status === "connected"
  const isConnecting = status.status === "connecting"
  const isError = status.status === "error"

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-3 w-3 items-center justify-center">
        <span
          className={`block h-2 w-2 rounded-full ${
            isConnected
              ? "bg-green-500"
              : isConnecting
                ? "bg-yellow-500"
                : "bg-red-500"
          }`}
        />
        {isConnected && (
          <span className="absolute h-2 w-2 animate-ping rounded-full bg-green-500 opacity-75" />
        )}
      </div>

      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {isConnected ? (
          <>
            <Wifi className="h-3 w-3" />
            Connected
          </>
        ) : isConnecting ? (
          <>
            <Wifi className="h-3 w-3" />
            Connecting...
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            {isError && status.error ? status.error : "Disconnected"}
          </>
        )}
      </span>
    </div>
  )
}
