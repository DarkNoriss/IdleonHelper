import * as React from "react"

import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar"
import { Home } from "./pages/home"
import { ThemeProvider } from "./providers/theme-provider"

export const AppNew = (): React.ReactElement => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <div className="flex h-screen flex-col">
        <AppHeader />
        <SidebarProvider className="min-h-0 flex-1">
          <AppSidebar />
          <SidebarInset>
            {/* <div className="bg-background text-foreground flex h-screen flex-col items-center justify-center gap-4"> */}
            <Home />
            {/* </div> */}
          </SidebarInset>
        </SidebarProvider>
      </div>
    </ThemeProvider>
  )
}
