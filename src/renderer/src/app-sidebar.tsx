import * as React from "react"
import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// Navigation data with routes
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
    },
    {
      title: "Test",
      url: "/test",
    },
    {
      title: "World 1",
      items: [
        {
          title: "Temp",
          url: "/world-1/temp",
        },
      ],
    },
    {
      title: "World 2",
      items: [
        {
          title: "Temp",
          url: "/world-2/temp",
        },
      ],
    },
    {
      title: "World 3",
      items: [
        {
          title: "Temp",
          url: "/world-3/temp",
        },
        {
          title: "Construction",
          url: "/world-3/construction",
        },
      ],
    },
    {
      title: "World 4",
      items: [
        {
          title: "Temp",
          url: "/world-4/temp",
        },
      ],
    },
    {
      title: "World 5",
      items: [
        {
          title: "Temp",
          url: "/world-5/temp",
        },
      ],
    },
    {
      title: "World 6",
      items: [
        {
          title: "Temp",
          url: "/world-6/temp",
        },
      ],
    },
    {
      title: "World 7",
      items: [
        {
          title: "Temp",
          url: "/world-7/temp",
        },
      ],
    },
  ],
}

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>): React.ReactElement {
  return (
    <Sidebar {...props} variant="inset">
      <SidebarContent className="gap-0">
        {data.navMain.map((item) => {
          // If item has no children, render as a simple button
          if (!item.items || item.items.length === 0) {
            if (!item.url) return null

            return (
              <SidebarGroup key={item.title}>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to={item.url}>{item.title}</Link>
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
                          <SidebarMenuButton asChild>
                            <Link to={subItem.url}>{subItem.title}</Link>
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
      <SidebarRail />
    </Sidebar>
  )
}
