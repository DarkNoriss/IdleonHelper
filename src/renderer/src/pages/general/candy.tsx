import * as React from "react"
import { useWorkingStore } from "@/stores/working"
import { useWebSocketStore } from "@/stores/ws"
import { Loader2, Play, SquareX } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ButtonWorkingAction } from "@/components/button-working-action"

const CANDY_SOURCE = "general-candy"
const CANDY_MESSAGE_TYPE = "general-candy-start"
const CANDY_CANCEL_MESSAGE_TYPE = "general-candy-stop"

export const Candy = (): React.ReactElement => {
  const [error, setError] = React.useState<string | null>(null)
  const { isConnected, send, subscribe } = useWebSocketStore()
  const { isWorking, currentAction, stopWorking } = useWorkingStore()

  React.useEffect(() => {
    const handler = (msg: { type: string; data?: unknown }): void => {
      if (msg.type === "data") {
        console.log("[Candy] Backend response:", msg.data)
      }

      if (msg.type === "done") {
        stopWorking()
      }

      if (msg.type === "error") {
        setError(String(msg.data ?? "Unknown error"))
        stopWorking()
      }
    }

    const unsubscribe = subscribe(CANDY_SOURCE, handler)

    return () => {
      unsubscribe()
    }
  }, [subscribe, stopWorking])

  const sendCandyStart = React.useEffectEvent(() => {
    if (!isConnected) {
      setError("WebSocket is not connected.")
      return false
    }

    setError(null)
    send({
      type: CANDY_MESSAGE_TYPE,
      source: CANDY_SOURCE,
    })
    return true
  })

  const sendCandyCancel = React.useEffectEvent(() => {
    if (!isConnected) {
      setError("WebSocket is not connected.")
      return
    }

    setError(null)
    send({
      type: CANDY_CANCEL_MESSAGE_TYPE,
      source: CANDY_SOURCE,
    })
  })

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      {error && <div className="text-destructive text-sm">{error}</div>}
      <Card>
        <CardHeader>
          <CardTitle>Candy Automation</CardTitle>
          <CardDescription>
            Automatically finds and clicks candy, then storage or claim. Loops
            until stopped or candy is not found.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid w-full grid-cols-2 gap-3">
          <ButtonWorkingAction
            actionKey={CANDY_MESSAGE_TYPE}
            label="Start"
            workingLabel="Running..."
            icon={<Play className="mr-2 size-4" />}
            workingIcon={<Loader2 className="mr-2 size-4 animate-spin" />}
            disabled={!isConnected}
            onAction={sendCandyStart}
          />

          <Button
            variant="destructive"
            disabled={
              !isConnected || !isWorking || currentAction !== CANDY_MESSAGE_TYPE
            }
            onClick={sendCandyCancel}
          >
            <SquareX className="mr-2 size-4" />
            Stop
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
