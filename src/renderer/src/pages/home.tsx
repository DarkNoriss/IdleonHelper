import { Button } from "@/components/ui/button"

import electronLogo from "../assets/electron.svg"
import { VersionsNew } from "../components/versions"
import { useTheme } from "../providers/theme-provider"

export const Home = () => {
  const ipcHandle = (): void => window.electron.ipcRenderer.send("ping")
  const { theme, setTheme } = useTheme()

  return (
    <>
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
      <Button
        onClick={() => {
          setTheme(theme === "dark" ? "light" : "dark")
          console.log(theme)
        }}
      >
        Toggle Theme
      </Button>
      <VersionsNew />
    </>
  )
}
