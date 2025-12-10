import { Activity, useEffect, useEffectEvent, type ReactElement } from "react"

import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar"
import { AccountData } from "./pages/account-data"
import { Dashboard } from "./pages/dashboard"
import { WeeklyBattle } from "./pages/worlds/world-2/weekly-battle"
import { Construction } from "./pages/worlds/world-3/construction"
import { ConstructionNew } from "./pages/worlds/world-3/construction-new"
import { ThemeProvider } from "./providers/theme-provider"
import { useNavigationStore, type NavigationPage } from "./stores/navigation"
import { useWebSocketStore } from "./stores/ws"

export const AppNew = (): ReactElement => {
  const { connect, disconnect } = useWebSocketStore()
  const currentPage = useNavigationStore((state) => state.currentPage)

  const pageMap: Record<NavigationPage, ReactElement> = {
    dashboard: <Dashboard />,
    "account-data": <AccountData />,
    "world-2/weekly-battle": <WeeklyBattle />,
    "world-3/construction": <Construction />,
    "world-3/construction-new": <ConstructionNew />,
  }
  const pageEntries = Object.entries(pageMap) as Array<
    [NavigationPage, ReactElement]
  >

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
      <div className="flex h-screen flex-col">
        <AppHeader />
        <SidebarProvider className="min-h-0 flex-1">
          <AppSidebar />
          <SidebarInset>
            {pageEntries.map(([pageKey, page]) => (
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
