import { useEffect, useState } from "react"
import { useNavigationStore, type NavigationPage } from "@/store/navigation"
import { ChevronRight } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
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
} from "@/components/ui/sidebar"

import { SidebarBackendStatus } from "./backend-status"
import { UpdateStatus } from "./update-status"

// Navigation data with routes
type NavItem = {
  title: string
  page?: NavigationPage
  items?: { title: string; page: NavigationPage; devOnly?: boolean }[]
  devOnly?: boolean
}

const getNavItems = (): NavItem[] => {
  const baseNav: NavItem[] = [
    {
      title: "Dashboard",
      page: "dashboard",
    },
    {
      title: "Raw Data",
      page: "rawData",
    },
    {
      title: "General",
      items: [
        {
          title: "Logs",
          page: "logs",
        },
        {
          title: "Test",
          page: "general/test",
          devOnly: true,
        },
      ],
    },
    {
      title: "World 2",
      items: [
        {
          title: "Weekly Battle",
          page: "weeklyBattle",
        },
      ],
    },
    {
      title: "World 3",
      items: [
        {
          title: "Construction",
          page: "world3/construction",
        },
      ],
    },
    {
      title: "World 6",
      items: [
        {
          title: "Summoning",
          page: "summoning",
        },
      ],
    },
  ]

  return baseNav
}

export const AppSidebar = ({
  ...props
}: React.ComponentProps<typeof Sidebar>) => {
  const currentPage = useNavigationStore((state) => state.currentPage)
  const setPage = useNavigationStore((state) => state.setPage)
  const [isDev, setIsDev] = useState(false)

  useEffect(() => {
    // Check if we're in dev mode
    window.api.app
      .isDev()
      .then(setIsDev)
      .catch(() => setIsDev(false))
  }, [])

  const navMain = getNavItems()

  return (
    <Sidebar {...props} variant="inset">
      <SidebarContent className="gap-0">
        <ScrollArea className="h-full">
          {navMain
            .filter((item) => !item.devOnly || isDev)
            .map((item) => {
              // If item has no children, render as a simple button
              if (!item.items || item.items.length === 0) {
                if (!item.page) return null

                return (
                  <SidebarGroup key={item.title}>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={currentPage === item.page}
                          onClick={() => item.page && setPage(item.page)}
                        >
                          {item.title}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroup>
                )
              }

              // Filter sub-items based on devOnly
              const visibleItems = item.items.filter(
                (subItem) => !subItem.devOnly || isDev
              )

              // Don't render collapsible if no visible items
              if (visibleItems.length === 0) return null

              // If item has children, render as collapsible
              return (
                <Collapsible
                  key={item.title}
                  title={item.title}
                  defaultOpen
                  className="group/collapsible"
                >
                  <SidebarGroup>
                    <SidebarGroupLabel
                      asChild
                      className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
                    >
                      <CollapsibleTrigger>
                        {item.title}
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </CollapsibleTrigger>
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
              )
            })}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <UpdateStatus />
        <SidebarBackendStatus />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
