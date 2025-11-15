import { AppSidebar } from "./app-sidebar"
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar"
import { Home } from "./pages/home"
import { ThemeProvider } from "./providers/theme-provider"

export const AppNew = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {/* <div className="bg-background text-foreground flex h-screen flex-col items-center justify-center gap-4"> */}
          <Home />
          {/* </div> */}
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  )
}
