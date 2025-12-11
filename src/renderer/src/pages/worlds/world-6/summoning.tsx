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

const ENDLESS_SOURCE = "world-6-summoning"
const ENDLESS_MESSAGE_TYPE = "world-6-summoning-start"
const ENDLESS_CANCEL_MESSAGE_TYPE = "world-6-summoning-cancel"

const AUTOBATTLER_SOURCE = "world-6-autobattler"
const AUTOBATTLER_MESSAGE_TYPE = "world-6-autobattler-start"
const AUTOBATTLER_CANCEL_MESSAGE_TYPE = "world-6-autobattler-cancel"

export const World6Summoning = (): React.ReactElement => {
  const [error, setError] = React.useState<string | null>(null)
  const { isConnected, send, subscribe } = useWebSocketStore()
  const { isWorking, currentAction, stopWorking } = useWorkingStore()

  React.useEffect(() => {
    const handler = (msg: { type: string; data?: unknown }): void => {
      if (msg.type === "data") {
        console.log("[World6Summoning] Backend response:", msg.data)
      }

      if (msg.type === "done") {
        stopWorking()
      }

      if (msg.type === "error") {
        setError(String(msg.data ?? "Unknown error"))
        stopWorking()
      }
    }

    const unsubscribeEndless = subscribe(ENDLESS_SOURCE, handler)
    const unsubscribeAutobattler = subscribe(AUTOBATTLER_SOURCE, handler)

    return () => {
      unsubscribeEndless()
      unsubscribeAutobattler()
    }
  }, [subscribe, stopWorking])

  const sendAutobattlerStart = React.useEffectEvent(() => {
    if (!isConnected) {
      setError("WebSocket is not connected.")
      return false
    }

    setError(null)
    send({
      type: AUTOBATTLER_MESSAGE_TYPE,
      source: AUTOBATTLER_SOURCE,
    })
    return true
  })

  const sendAutobattlerCancel = React.useEffectEvent(() => {
    if (!isConnected) {
      setError("WebSocket is not connected.")
      return
    }

    setError(null)
    send({
      type: AUTOBATTLER_CANCEL_MESSAGE_TYPE,
      source: AUTOBATTLER_SOURCE,
    })
  })

  const sendEndlessStart = React.useEffectEvent(() => {
    if (!isConnected) {
      setError("WebSocket is not connected.")
      return false
    }

    setError(null)
    send({
      type: ENDLESS_MESSAGE_TYPE,
      source: ENDLESS_SOURCE,
    })
    return true
  })

  const sendEndlessCancel = React.useEffectEvent(() => {
    if (!isConnected) {
      setError("WebSocket is not connected.")
      return
    }

    setError(null)
    send({
      type: ENDLESS_CANCEL_MESSAGE_TYPE,
      source: ENDLESS_SOURCE,
    })
  })

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      {error && <div className="text-destructive text-sm">{error}</div>}
      <Card>
        <CardHeader>
          <CardTitle>Autobattler</CardTitle>
          <CardDescription>
            How to use? Open summoning board select oponent then before clicking
            begin match start autobattler.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid w-full grid-cols-2 gap-3">
          <ButtonWorkingAction
            actionKey={AUTOBATTLER_MESSAGE_TYPE}
            label="Start Autobattler"
            workingLabel="Starting autobattler..."
            icon={<Play className="mr-2 size-4" />}
            workingIcon={<Loader2 className="mr-2 size-4 animate-spin" />}
            disabled={!isConnected}
            onAction={sendAutobattlerStart}
          />

          <Button
            variant="destructive"
            disabled={
              !isConnected ||
              !isWorking ||
              currentAction !== AUTOBATTLER_MESSAGE_TYPE
            }
            onClick={sendAutobattlerCancel}
          >
            <SquareX className="mr-2 size-4" />
            Cancel
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endless Autobattler</CardTitle>
          <CardDescription>
            How to use? Open summoning board and start endless autobattler.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid w-full grid-cols-2 gap-3">
          <ButtonWorkingAction
            actionKey={ENDLESS_MESSAGE_TYPE}
            label="Start Endless"
            workingLabel="Starting endless..."
            icon={<Play className="mr-2 size-4" />}
            workingIcon={<Loader2 className="mr-2 size-4 animate-spin" />}
            disabled={!isConnected}
            onAction={sendEndlessStart}
          />

          <Button
            variant="destructive"
            disabled={
              !isConnected ||
              !isWorking ||
              currentAction !== ENDLESS_MESSAGE_TYPE
            }
            onClick={sendEndlessCancel}
          >
            <SquareX className="mr-2 size-4" />
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
