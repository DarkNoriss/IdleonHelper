import { X } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

export const AppHeader = () => {
  const handleClose = () => {
    window.api.window.close();
  };

  return (
    <header
      className={cn(
        "relative flex h-8 w-full shrink-0 items-center justify-center bg-sidebar text-sidebar-foreground"
      )}
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="flex items-center">
        <h1 className="font-semibold text-sm">Idleon Helper</h1>
      </div>

      <div className="absolute right-0 flex items-center gap-2">
        <Button
          className="p-2! hover:rounded-none! hover:bg-destructive! hover:text-destructive-foreground!"
          onClick={handleClose}
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};
