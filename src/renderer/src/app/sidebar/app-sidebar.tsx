import * as React from "react"
import { useNavigationStore, type NavigationPage } from "@/store/navigation"
import { ChevronRight } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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

// Navigation data with routes
type NavItem = {
  title: string
  page?: NavigationPage
  items?: { title: string; page: NavigationPage }[]
}

const navMain: NavItem[] = [
  {
    title: "Dashboard",
    page: "dashboard",
  },
]

export const AppSidebar = ({
  ...props
}: React.ComponentProps<typeof Sidebar>) => {
  const currentPage = useNavigationStore((state) => state.currentPage)
  const setPage = useNavigationStore((state) => state.setPage)

  return (
    <Sidebar {...props} variant="inset">
      <SidebarContent className="gap-0">
        {navMain.map((item) => {
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
                      {item.items.map((subItem) => (
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
      </SidebarContent>

      <SidebarFooter>
        {/* <UpdateStatus /> */}
        <SidebarBackendStatus />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
