import { useEffect, useRef, useState } from "react";
import { PageHead, TermSelect } from "@/components/terminal";

type LogLevel = "log" | "error" | "warn" | "info";
type LogEntry = {
  timestamp: number;
  level: LogLevel;
  message: string;
};

const levelColor = (level: LogLevel): string => {
  switch (level) {
    case "error":
      return "text-destructive";
    case "warn":
      return "text-warn";
    case "info":
      return "text-info";
    default:
      return "text-text-dim";
  }
};

const formatTimestamp = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString();

const filterOptions = [
  { value: "all", label: "all levels" },
  { value: "log", label: "log" },
  { value: "info", label: "info" },
  { value: "warn", label: "warn" },
  { value: "error", label: "error" },
];

const Logs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState("all");
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.api.logs
      .get()
      .then(setLogs)
      .catch(() => {
        // ignore
      });
    return window.api.logs.onChange(setLogs);
  }, []);

  useEffect(() => {
    if (logs.length === 0) {
      return;
    }
    const el = viewportRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs.length]);

  const filtered =
    filter === "all" ? logs : logs.filter((l) => l.level === filter);

  return (
    <>
      <PageHead
        actions={
          <div className="flex items-center gap-1.5">
            <TermSelect
              onChange={setFilter}
              options={filterOptions}
              value={filter}
            />
          </div>
        }
        description="Live application logs. Tail updates in real-time as scripts run."
        path="general / logs"
        title="logs"
      />
      <div
        className="h-[360px] overflow-auto rounded-[4px] border border-border bg-background p-2 font-mono text-[10.5px] leading-[1.7]"
        ref={viewportRef}
      >
        {filtered.length === 0 ? (
          <div className="text-text-muted">no logs available</div>
        ) : (
          filtered.map((log, index) => (
            <div className="flex gap-2" key={`${log.timestamp}-${index}`}>
              <span className="shrink-0 text-text-muted">
                [{formatTimestamp(log.timestamp)}]
              </span>
              <span
                className={`w-11 shrink-0 font-medium ${levelColor(log.level)}`}
              >
                [{log.level.toUpperCase()}]
              </span>
              <span className="min-w-0 break-words text-foreground">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default Logs;
