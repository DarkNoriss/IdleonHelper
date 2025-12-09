import { useEffect, useEffectEvent, type ReactElement } from "react"
import { HashRouter, Route, Routes } from "react-router-dom"

import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar"
import { Dashboard } from "./pages/dashboard"
import { GameWindow } from "./pages/game-window"
import { World1Temp } from "./pages/worlds/world-1/temp"
import { World2Temp } from "./pages/worlds/world-2/temp"
import { WeeklyBattle } from "./pages/worlds/world-2/weekly-battle"
import { Construction } from "./pages/worlds/world-3/construction"
import { World3Temp } from "./pages/worlds/world-3/temp"
import { World4Temp } from "./pages/worlds/world-4/temp"
import { World5Temp } from "./pages/worlds/world-5/temp"
import { World6Temp } from "./pages/worlds/world-6/temp"
import { World7Temp } from "./pages/worlds/world-7/temp"
import { ThemeProvider } from "./providers/theme-provider"
import { useWebSocketStore } from "./stores/ws"

export const AppNew = (): ReactElement => {
  const { connect, disconnect } = useWebSocketStore()

  const onConnect = useEffectEvent(() => {
    connect()
  })

  const onDisconnect = useEffectEvent(() => {
    disconnect()
  })

  useEffect(() => {
    onConnect()

    return () => {
      onDisconnect()
    }
  }, [])

  return (
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <HashRouter>
        <div className="flex h-screen flex-col">
          <AppHeader />
          <SidebarProvider className="min-h-0 flex-1">
            <AppSidebar />
            <SidebarInset>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/game-window" element={<GameWindow />} />
                <Route path="/world-1/temp" element={<World1Temp />} />
                <Route path="/world-2/temp" element={<World2Temp />} />
                <Route
                  path="/world-2/weekly-battle"
                  element={<WeeklyBattle />}
                />
                <Route path="/world-3/temp" element={<World3Temp />} />
                <Route
                  path="/world-3/construction"
                  element={<Construction />}
                />
                <Route path="/world-4/temp" element={<World4Temp />} />
                <Route path="/world-5/temp" element={<World5Temp />} />
                <Route path="/world-6/temp" element={<World6Temp />} />
                <Route path="/world-7/temp" element={<World7Temp />} />
              </Routes>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </HashRouter>
    </ThemeProvider>
  )
}
