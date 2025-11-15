import { Home } from "./pages/home"
import { ThemeProvider } from "./providers/theme-provider"

export const AppNew = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="bg-background text-foreground flex h-screen flex-col items-center justify-center gap-4">
        <Home />
      </div>
    </ThemeProvider>
  )
}
