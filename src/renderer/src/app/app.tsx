import { Activity, type ReactElement } from "react"
import { ThemeProvider } from "@/providers/theme-provider"
import { useNavigationStore, type NavigationPage } from "@/store/navigation"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { AppHeader } from "./app-header"
import { Dashboard } from "./pages/dashboard"
import { Test } from "./pages/test"
import { AppSidebar } from "./sidebar/app-sidebar"

export const App = () => {
  const currentPage = useNavigationStore((state) => state.currentPage)

  const pageMap: Record<NavigationPage, ReactElement> = {
    dashboard: <Dashboard />,
    test: <Test />,
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
