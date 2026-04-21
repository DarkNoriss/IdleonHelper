import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { navConfig } from "@/app/nav-config.ts";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar.tsx";
import { useNavigationStore } from "@/store/navigation.ts";

import { SidebarBackendStatus } from "./backend-status";
import { UpdateStatus } from "./update-status";

export const AppSidebar = ({
  ...props
}: React.ComponentProps<typeof Sidebar>) => {
  const currentPage = useNavigationStore((state) => state.currentPage);
  const setPage = useNavigationStore((state) => state.setPage);
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    window.api.app
      .isDev()
      .then(setIsDev)
      .catch(() => setIsDev(false));
  }, []);

  return (
    <Sidebar {...props} variant="inset">
      <SidebarContent className="gap-0">
        <ScrollArea className="h-full">
          {navConfig.map((entry) => {
            if (!("items" in entry)) {
              return (
                <SidebarGroup key={entry.title}>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={currentPage === entry.page}
                        onClick={() => setPage(entry.page)}
                      >
                        {entry.title}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroup>
              );
            }

            const visibleItems = entry.items.filter(
              (subItem) => !subItem.devOnly || isDev
            );

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <Collapsible
                className="group/collapsible"
                key={entry.title}
                title={entry.title}
              >
                <SidebarGroup>
                  <SidebarGroupLabel
                    className="group/label text-sidebar-foreground text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    render={<CollapsibleTrigger />}
                  >
                    {entry.title}
                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {visibleItems.map((subItem) => (
                          <SidebarMenuItem key={subItem.title}>
                            <SidebarMenuButton
                              isActive={currentPage === subItem.page}
                              onClick={() => setPage(subItem.page)}
                            >
                              {subItem.title}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          })}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <UpdateStatus />
        <SidebarBackendStatus />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
