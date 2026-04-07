import { Wifi, WifiOff } from "lucide-react";
import { useMainState } from "@/hooks/use-main-state.ts";

export const SidebarBackendStatus = () => {
  const backendStatus = useMainState("backendStatus");

  const status = backendStatus?.status ?? "connecting";
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

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

      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
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
  );
};
