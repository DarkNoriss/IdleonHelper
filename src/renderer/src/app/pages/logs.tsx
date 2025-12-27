import { useEffect, useRef, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type LogEntry = {
  timestamp: number
  level: "log" | "error" | "warn" | "info"
  message: string
}

const getLevelColor = (level: LogEntry["level"]): string => {
  switch (level) {
    case "error":
      return "text-destructive"
    case "warn":
      return "text-yellow-500"
    case "info":
      return "text-blue-500"
    default:
      return "text-foreground"
  }
}

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString()
}

export const Logs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight
    }
  }, [logs])

  useEffect(() => {
    // Fetch all logs on mount
    const loadLogs = async () => {
      try {
        const allLogs = await window.api.logs.get()
        setLogs(allLogs)
      } catch (error) {
        console.error("Failed to load logs:", error)
      }
    }

    loadLogs()

    // Set up real-time listener
    const cleanup = window.api.logs.onChange((newLogs) => {
      setLogs(newLogs)
    })

    return cleanup
  }, [])

  return (
    <Card className="relative m-4 h-[calc(100vh-8rem)]">
      <CardHeader>
        <CardTitle>Application Logs</CardTitle>
      </CardHeader>
      <CardContent className="flex h-[calc(100%-5rem)] flex-col">
        <div
          ref={scrollContainerRef}
          className="bg-muted/50 flex-1 overflow-y-auto rounded-md p-4 font-mono text-sm"
        >
          {logs.length === 0 ? (
            <div className="text-muted-foreground">No logs available</div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">
                    [{formatTimestamp(log.timestamp)}]
                  </span>
                  <span
                    className={`shrink-0 font-semibold ${getLevelColor(log.level)}`}
                  >
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="wrap-break-word">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
