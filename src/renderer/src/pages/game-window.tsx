import * as React from "react"

import { Button } from "@/components/ui/button"

export const GameWindow = (): React.ReactElement => {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Game Window</h1>
      <div className="flex gap-2">
        <Button onClick={() => {}}>Find Window</Button>
        <Button onClick={() => {}}>Screenshot</Button>
      </div>
    </div>
  )
}
