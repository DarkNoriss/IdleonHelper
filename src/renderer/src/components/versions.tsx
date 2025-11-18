import { useState, type ReactElement } from "react"

export const VersionsNew = (): ReactElement => {
  const [versions] = useState(window.electron.process.versions)

  return (
    <ul className="flex flex-row gap-2">
      <li className="text-muted-foreground text-sm">
        Electron v{versions.electron}
      </li>
      <li className="text-muted-foreground text-sm">
        Chromium v{versions.chrome}
      </li>
      <li className="text-muted-foreground text-sm">Node v{versions.node}</li>
    </ul>
  )
}
