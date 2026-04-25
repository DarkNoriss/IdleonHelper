import { type ComponentType, lazy, Suspense } from "react";
import { ConsentDialog } from "@/components/profile/consent-dialog";
import { QueueDock } from "@/components/queue-dock";
import { AuthProvider } from "@/providers/auth-provider";
import { GameDataProvider } from "@/providers/game-data-provider.tsx";
import { ThemeProvider } from "@/providers/theme-provider.tsx";
import { type NavigationPage, useNavigationStore } from "@/store/navigation.ts";
import { DevBanner } from "./dev-banner";
import { pageRegistry } from "./page-registry";
import { AppSidebar } from "./sidebar/app-sidebar";
import { TitleBar } from "./title-bar";

const lazyPages = Object.fromEntries(
  Object.entries(pageRegistry).map(([key, loader]) => [key, lazy(loader)])
) as unknown as Record<
  NavigationPage,
  React.LazyExoticComponent<ComponentType>
>;

export const App = () => {
  const currentPage = useNavigationStore((state) => state.currentPage);
  const ActivePage = lazyPages[currentPage];

  return (
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <AuthProvider>
        <GameDataProvider>
          <ConsentDialog />
          <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
            <TitleBar />
            <DevBanner />
            <div className="flex min-h-0 flex-1">
              <AppSidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 overflow-auto px-4 pt-3 pb-2">
                  <Suspense fallback={null}>
                    <ActivePage />
                  </Suspense>
                </div>
                <QueueDock />
              </div>
            </div>
          </div>
        </GameDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
