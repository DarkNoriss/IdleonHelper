import { Wifi, WifiOff } from "lucide-react"

import { useWebSocketStore } from "./stores/ws"

export const BackendStatus = (): React.ReactElement => {
  const { isConnected, error } = useWebSocketStore()

  const isConnecting = !isConnected && !error

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-3 w-3 items-center justify-center">
        <span
          className={`block h-2 w-2 rounded-full ${
            isConnected
              ? "bg-green-500"
              : isConnecting
                ? "bg-gray-500"
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
            Disconnected
          </>
        )}
      </span>
    </div>
  )
}
