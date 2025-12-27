import { Activity, useEffect, type ReactElement } from "react"
import { ThemeProvider } from "@/providers/theme-provider"
import { useNavigationStore, type NavigationPage } from "@/store/navigation"
import { useScriptStatusStore } from "@/store/script-status"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { AppHeader } from "./app-header"
import { Dashboard } from "./pages/dashboard"
import { Logs } from "./pages/logs"
import { WeeklyBattle } from "./pages/world-2/weekly-battle"
import { Summoning } from "./pages/world-6/summoning"
import { AppSidebar } from "./sidebar/app-sidebar"

export const App = () => {
  const currentPage = useNavigationStore((state) => state.currentPage)
  const setCurrentScript = useScriptStatusStore(
    (state) => state.setCurrentScript
  )

  useEffect(() => {
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

  const pageMap: Record<NavigationPage, ReactElement> = {
    dashboard: <Dashboard />,
    logs: <Logs />,
    weeklyBattle: <WeeklyBattle />,
    summoning: <Summoning />,
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <div className="flex h-screen flex-col">
        <AppHeader />
        <SidebarProvider className="min-h-0 flex-1">
          <AppSidebar />
          <SidebarInset>
            {Object.entries(pageMap).map(([pageKey, page]) => (
              <Activity
                key={pageKey}
                mode={currentPage === pageKey ? "visible" : "hidden"}
              >
                {page}
              </Activity>
            ))}
          </SidebarInset>
        </SidebarProvider>
      </div>
    </ThemeProvider>
  )
}
