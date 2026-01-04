import { useEffect, useState, type ReactElement } from "react"
import { GameDataProvider } from "@/providers/game-data-provider"
import { ThemeProvider } from "@/providers/theme-provider"
import { useNavigationStore, type NavigationPage } from "@/store/navigation"
import { useScriptStatusStore } from "@/store/script-status"

import { ScrollArea } from "@/components/ui/scroll-area"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { AppHeader } from "./app-header"
import { Dashboard } from "./pages/dashboard"
import { Test } from "./pages/general/test"
import { Logs } from "./pages/logs"
import { RawData } from "./pages/raw-data"
import { WeeklyBattle } from "./pages/world-2/weekly-battle"
import { Construction } from "./pages/world-3/construction"
import { Summoning } from "./pages/world-6/summoning"
import { AppSidebar } from "./sidebar/app-sidebar"

export const App = () => {
  const currentPage = useNavigationStore((state) => state.currentPage)
  const setCurrentScript = useScriptStatusStore(
    (state) => state.setCurrentScript
  )
  const [isDev, setIsDev] = useState(false)

  useEffect(() => {
    // Check if we're in dev mode
    window.api.app
      .isDev()
      .then(setIsDev)
      .catch(() => setIsDev(false))

    // Get initial status
    window.api.script.getStatus().then((status) => {
      if (!status.isWorking) {
        setCurrentScript(null)
      }
    })

    // Listen for status changes
    const cleanup = window.api.script.onStatusChange((status) => {
      if (!status.isWorking) {
        setCurrentScript(null)
      }
    })

    return cleanup
  }, [setCurrentScript])

  const pageMap: Partial<Record<NavigationPage, ReactElement>> = {
    dashboard: <Dashboard />,
    rawData: <RawData />,
    logs: <Logs />,
    weeklyBattle: <WeeklyBattle />,
    summoning: <Summoning />,
    "world3/construction": <Construction />,
    ...(isDev && { "general/test": <Test /> }),
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <GameDataProvider>
        <div className="flex h-screen flex-col">
          <AppHeader />
          <SidebarProvider className="min-h-0 flex-1">
            <AppSidebar />
            <SidebarInset>
              <ScrollArea className="h-full p-2">
                {Object.entries(pageMap).map(([pageKey, page]) => (
                  <div
                    key={pageKey}
                    className={
                      currentPage === pageKey ? "block h-full" : "hidden"
                    }
                  >
                    {page}
                  </div>
                ))}
              </ScrollArea>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </GameDataProvider>
    </ThemeProvider>
  )
}
