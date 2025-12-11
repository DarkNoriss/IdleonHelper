import * as React from "react"
import { useWorkingStore } from "@/stores/working"
import { useWebSocketStore } from "@/stores/ws"
import { Loader2, RefreshCw, Skull, Trophy } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ButtonWorkingAction } from "@/components/button-working-action"

const CURRENT_RUN_DATE_URL =
  "https://docs.google.com/spreadsheets/d/1o4g1_CQCfjrVzhaMKBcpKDv-o1zqjH0bVt22KwTXeLA/edit?gid=0#gid=0&range=F2:L2"

const BOSS_NAME_URL =
  "https://docs.google.com/spreadsheets/d/1o4g1_CQCfjrVzhaMKBcpKDv-o1zqjH0bVt22KwTXeLA/edit?gid=0#gid=0&range=H3:L4"

const SKULL_URL =
  "https://docs.google.com/spreadsheets/d/1o4g1_CQCfjrVzhaMKBcpKDv-o1zqjH0bVt22KwTXeLA/edit?gid=0#gid=0&range=F10:H28"

const TROPHY_URL =
  "https://docs.google.com/spreadsheets/d/1o4g1_CQCfjrVzhaMKBcpKDv-o1zqjH0bVt22KwTXeLA/edit?gid=0#gid=0&range=J10:L28"

const WS_SOURCE = "world-2-weekly-battle"
const WS_MESSAGE_TYPE = "world-2-weekly-battle-run"

const buildCsvUrlFromSheetLink = (sheetUrl: string): string => {
  const url = new URL(sheetUrl)
  const pathParts = url.pathname.split("/")
  const sheetIdIndex = pathParts.findIndex((part) => part === "d")
  const sheetId = sheetIdIndex > -1 ? pathParts[sheetIdIndex + 1] : null
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""))
  const gid = hashParams.get("gid")
  const range = hashParams.get("range")

  if (!sheetId || !gid || !range) {
    throw new Error("Invalid Google Sheet URL: missing sheetId, gid, or range")
  }

  const csvUrl = new URL(
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`
  )
  csvUrl.searchParams.set("tqx", "out:csv")
  csvUrl.searchParams.set("gid", gid)
  csvUrl.searchParams.set("range", range)

  return csvUrl.toString()
}

const fetchSheetRange = async (
  sheetUrl: string,
  label: string,
  onComplete: () => void = () => {}
): Promise<string> => {
  try {
    const csvUrl = buildCsvUrlFromSheetLink(sheetUrl)
    console.info(`[WeeklyBattle] Fetching ${label} data from ${csvUrl}`)
    const response = await fetch(csvUrl)
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }

    const csvText = await response.text()
    console.log(`[WeeklyBattle] ${label} data (CSV):\n${csvText}`)
    return csvText
  } catch (error) {
    console.error(`[WeeklyBattle] Failed to fetch ${label} data`, error)
    return ""
  } finally {
    onComplete()
  }
}

const extractFirstCell = (csv: string): string | null => {
  const firstLine = csv.split(/\r?\n/).find((line) => line.trim() !== "")
  if (!firstLine) return null
  const firstCell = firstLine.split(",")[0] ?? ""
  return firstCell.replace(/^"|"$/g, "").trim() || null
}

const normalizeRows = (rows: string[][]): string[] =>
  rows
    .map((row) => row.filter(Boolean).join(" ").trim())
    .filter((line) => line.length > 0)

type StepLine = {
  text: string
  numbers: number[]
}

type RunData = {
  header: string | null
  steps: StepLine[]
  bonuses: string[]
  numbers: number[]
}

type RunsState = {
  skull: RunData
  trophy: RunData
}

const createEmptyRunsState = (): RunsState => ({
  skull: { header: null, steps: [], bonuses: [], numbers: [] },
  trophy: { header: null, steps: [], bonuses: [], numbers: [] },
})

const extractNumbers = (line: string): number[] => {
  const matches = line.match(/\d+/g)
  return matches ? matches.map((n) => Number(n)) : []
}

const flattenStepNumbers = (steps: StepLine[]): number[] =>
  steps.flatMap((step) => step.numbers)

const parseSkullRunData = (
  rows: string[][]
): { header: string | null; steps: StepLine[] } => {
  const lines = normalizeRows(rows)
  let header: string | null = null
  const steps: StepLine[] = []

  lines.forEach((line) => {
    const lower = line.toLowerCase()
    if (!header && lower.includes("skull")) {
      header = line
      return
    }
    steps.push({ text: line, numbers: extractNumbers(line) })
  })

  return { header, steps }
}

const parseSkullRun = (
  rows: string[][]
): { header: string | null; steps: StepLine[]; bonuses: string[] } => {
  const lines = normalizeRows(rows)
  let header: string | null = null
  const steps: StepLine[] = []
  const bonuses: string[] = []

  lines.forEach((line) => {
    const lower = line.toLowerCase()
    if (!header && lower.includes("misc")) {
      const countMatch = line.match(/(\d+)(?!.*\d)/)
      const count = countMatch ? countMatch[1] : ""
      const base = line.replace(/(\s*\d+)?$/, "").trim()
      header = `${base} ${count}`.trim()
      return
    }

    if (lower.startsWith("bonus")) {
      bonuses.push(line)
      return
    }

    steps.push({ text: line, numbers: extractNumbers(line) })
  })

  return { header, steps, bonuses }
}

const parseCsv = (csv: string): string[][] => {
  const rows: string[][] = []
  let current = ""
  let currentRow: string[] = []
  let inQuotes = false

  const pushCell = (): void => {
    const cleaned = current.replace(/^"|"$/g, "").trim()
    currentRow.push(cleaned)
    current = ""
  }

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i] ?? ""
    const nextChar = csv[i + 1] ?? ""

    if (char === '"' && nextChar === '"') {
      current += '"'
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === "," && !inQuotes) {
      pushCell()
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current.length > 0 || currentRow.length > 0) {
        pushCell()
        rows.push(currentRow)
        currentRow = []
      }
      continue
    }

    current += char
  }

  if (current.length > 0 || currentRow.length > 0) {
    pushCell()
    rows.push(currentRow)
  }

  return rows.filter((row) => row.some((cell) => cell.trim() !== ""))
}

export const WeeklyBattle = (): React.ReactElement => {
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [currentRunDate, setCurrentRunDate] = React.useState<string | null>(
    null
  )
  const [bossName, setBossName] = React.useState<string | null>(null)
  const [runDateCells, setRunDateCells] = React.useState<string[]>([])
  const [runs, setRuns] = React.useState<RunsState>(createEmptyRunsState)
  const [error, setError] = React.useState<string | null>(null)

  const { isConnected, send, subscribe } = useWebSocketStore()
  const { stopWorking } = useWorkingStore()

  const fetchAllData = React.useEffectEvent(async () => {
    if (isRefreshing) {
      return
    }

    setIsRefreshing(true)
    try {
      const [currentCsv, bossCsv, skullCsv, trophyCsv] = await Promise.all([
        fetchSheetRange(CURRENT_RUN_DATE_URL, "current run date"),
        fetchSheetRange(BOSS_NAME_URL, "boss name"),
        fetchSheetRange(SKULL_URL, "skull run"),
        fetchSheetRange(TROPHY_URL, "trophy run"),
      ])

      setCurrentRunDate(extractFirstCell(currentCsv))
      setBossName(extractFirstCell(bossCsv))
      const skullParsed = parseCsv(skullCsv)
      const trophyParsed = parseCsv(trophyCsv)

      const {
        header: trophyHeader,
        steps: trophySteps,
        bonuses: trophyBonuses,
      } = parseSkullRun(trophyParsed)
      const { header: skullHeader, steps: skullSteps } =
        parseSkullRunData(skullParsed)

      setRuns({
        skull: {
          header: skullHeader,
          steps: skullSteps,
          bonuses: [],
          numbers: flattenStepNumbers(skullSteps),
        },
        trophy: {
          header: trophyHeader,
          steps: trophySteps,
          bonuses: trophyBonuses,
          numbers: flattenStepNumbers(trophySteps),
        },
      })
      setRunDateCells(
        parseCsv(currentCsv)
          .flat()
          .map((cell) => cell.trim())
          .filter((cell) => cell.length > 0 && cell !== "-")
      )
    } finally {
      setIsRefreshing(false)
    }
  })

  React.useEffect(() => {
    fetchAllData()
  }, [])

  React.useEffect(() => {
    const unsubscribe = subscribe(WS_SOURCE, (msg) => {
      if (msg.type === "data") {
        console.log("[WeeklyBattle] Backend response:", msg.data)
      }

      if (msg.type === "done") {
        stopWorking()
      }

      if (msg.type === "error") {
        setError(String(msg.data ?? "Unknown error"))
        stopWorking()
      }
    })

    return unsubscribe
  }, [subscribe, stopWorking])

  const sendRun = React.useEffectEvent((numbers: number[]) => {
    if (!isConnected) {
      setError("WebSocket is not connected.")
      return false
    }

    if (numbers.length === 0) {
      setError("No steps to send.")
      return false
    }

    setError(null)
    send({
      type: WS_MESSAGE_TYPE,
      source: WS_SOURCE,
      data: { numbers },
    })
    return true
  })

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <Card className="flex h-full flex-col">
        <CardHeader className="relative flex flex-col items-center justify-center">
          <CardTitle className="flex items-center justify-center text-2xl font-bold">
            {bossName ?? ""}
          </CardTitle>

          <CardDescription className="flex items-center justify-center text-lg font-bold">
            {runDateCells.length > 0
              ? runDateCells.join(" - ")
              : (currentRunDate ?? "")}
          </CardDescription>

          <Button
            className="absolute top-3 right-3"
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            onClick={() => {
              void fetchAllData()
            }}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="size-4" />
                Refresh
              </>
            )}
          </Button>
        </CardHeader>

        <CardContent className="h-full">
          {error && (
            <div className="bg-destructive/10 text-destructive mb-3 rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          <div className="grid h-full grid-cols-2 gap-3">
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-lg font-bold">
                {runs.skull.header ?? "Skull Run"}
              </h3>
              {runs.skull.steps.map((line, idx) => (
                <div
                  key={`skull-${idx}`}
                  className="flex flex-col items-center"
                >
                  <p>{line.text}</p>
                </div>
              ))}
              {runs.skull.bonuses.length > 0 && <div className="h-2" />}
              {runs.skull.bonuses.map((line, idx) => (
                <p key={`bonus-${idx}`}>{line}</p>
              ))}
            </div>

            <div className="flex flex-col items-center gap-2">
              <h3 className="text-lg font-bold">
                {runs.trophy.header ?? "Trophy Run"}
              </h3>
              {runs.trophy.steps.map((line, idx) => (
                <div
                  key={`trophy-${idx}`}
                  className="flex flex-col items-center"
                >
                  <p>{line.text}</p>
                </div>
              ))}
              {runs.trophy.bonuses.length > 0 && <div className="h-2" />}
              {runs.trophy.bonuses.map((line, idx) => (
                <p key={`trophy-bonus-${idx}`}>{line}</p>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ButtonWorkingAction
              actionKey="weekly-battle-skull"
              label="Skull run"
              workingLabel="Running..."
              icon={<Skull className="size-4" />}
              workingIcon={<Loader2 className="size-4 animate-spin" />}
              disabled={isRefreshing || !isConnected}
              onAction={() => {
                return sendRun(runs.skull.numbers)
              }}
            />

            <ButtonWorkingAction
              actionKey="weekly-battle-trophy"
              label="Trophy run"
              workingLabel="Running..."
              icon={<Trophy className="size-4" />}
              workingIcon={<Loader2 className="size-4 animate-spin" />}
              disabled={isRefreshing || !isConnected}
              onAction={() => {
                return sendRun(runs.trophy.numbers)
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
