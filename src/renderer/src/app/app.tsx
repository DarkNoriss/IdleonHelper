import { type ComponentType, lazy, Suspense, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { GameDataProvider } from "@/providers/game-data-provider.tsx";
import { ThemeProvider } from "@/providers/theme-provider.tsx";
import { type NavigationPage, useNavigationStore } from "@/store/navigation.ts";

import { AppHeader } from "./app-header.tsx";
import { pageRegistry } from "./page-registry.ts";
import { AppSidebar } from "./sidebar/app-sidebar.tsx";

const lazyPages = Object.fromEntries(
  Object.entries(pageRegistry).map(([key, loader]) => [key, lazy(loader)])
) as unknown as Record<
  NavigationPage,
  React.LazyExoticComponent<ComponentType>
>;

export const App = () => {
  const currentPage = useNavigationStore((state) => state.currentPage);
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    window.api.app
      .isDev()
      .then(setIsDev)
      .catch(() => setIsDev(false));
  }, []);

  const ActivePage = lazyPages[currentPage];

  if (currentPage === "general/test" && !isDev) {
    return null;
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <GameDataProvider>
        <div className="flex h-screen flex-col">
          <AppHeader />
          <SidebarProvider className="min-h-0 flex-1">
            <AppSidebar />
            <SidebarInset>
              <ScrollArea className="h-full max-h-full">
                <div className="block h-full max-h-full min-h-0 flex-1 p-2">
                  <Suspense fallback={null}>
                    <ActivePage />
                  </Suspense>
                </div>
              </ScrollArea>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </GameDataProvider>
    </ThemeProvider>
  );
};
