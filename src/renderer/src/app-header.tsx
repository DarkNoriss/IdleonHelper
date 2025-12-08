import * as React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export const AppHeader = (): React.ReactElement => {
  const handleClose = (): void => {
    window.api.window.close()
  }

  return (
    <header
      className={cn(
        "bg-sidebar text-sidebar-foreground relative flex h-8 w-full shrink-0 items-center justify-center"
      )}
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="flex items-center">
        <h1 className="text-smfont-semibold">Idleon Helper</h1>
      </div>

      <div className="absolute right-0 flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={handleClose}
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          className="hover:bg-destructive! hover:text-destructive-foreground! p-2! hover:rounded-none!"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
