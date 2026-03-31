import { useEffect, useRef, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";

type LogEntry = {
  timestamp: number;
  level: "log" | "error" | "warn" | "info";
  message: string;
};

const getLevelColor = (level: LogEntry["level"]): string => {
  switch (level) {
    case "error":
      return "text-destructive";
    case "warn":
      return "text-yellow-500";
    case "info":
      return "text-blue-500";
    default:
      return "text-foreground";
  }
};

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString();
};

export const Logs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      // Find the viewport element inside ScrollArea
      const viewport = scrollAreaRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]'
      ) as HTMLElement;
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    // Fetch all logs on mount
    const loadLogs = async () => {
      try {
        const allLogs = await window.api.logs.get();
        setLogs(allLogs);
      } catch (error) {
        console.error("Failed to load logs:", error);
      }
    };

    loadLogs();

    // Set up real-time listener
    const cleanup = window.api.logs.onChange((newLogs) => {
      setLogs(newLogs);
    });

    return cleanup;
  }, []);

  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="shrink-0 text-center font-bold text-2xl">
        Application Logs
      </h1>

      <ScrollArea
        className="h-[calc(100vh-8px*13)] rounded-md border"
        ref={scrollAreaRef}
      >
        <div className="bg-muted/50 p-4 font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-muted-foreground">No logs available</div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div className="flex gap-2" key={index}>
                  <span className="shrink-0 text-muted-foreground">
                    [{formatTimestamp(log.timestamp)}]
                  </span>
                  <span
                    className={`shrink-0 font-semibold ${getLevelColor(log.level)}`}
                  >
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="wrap-break-word min-w-0">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Logs;
