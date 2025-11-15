import { Button } from "@/components/ui/button"

import electronLogo from "./assets/electron.svg"
import { VersionsNew } from "./components/versions-new"

export const AppNew = () => {
  const ipcHandle = (): void => window.electron.ipcRenderer.send("ping")

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <div className="flex size-16 items-center justify-center">
        <img alt="logo" src={electronLogo} />
      </div>
      <h1 className="text-2xl font-bold">Powered by electron-vite</h1>
      <p className="text-muted-foreground text-sm">
        Build an Electron app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
      </p>
      <p className="text-muted-foreground text-sm">
        Please try pressing <code>F12</code> to open the devTool
      </p>
      <div className="flex gap-2">
        <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
          <Button>Documentation</Button>
        </a>
        <Button onClick={ipcHandle}>Send IPC</Button>
      </div>
      <VersionsNew />
    </div>
  )
}
