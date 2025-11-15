import * as React from "react"
import { ChevronRight } from "lucide-react"

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

// This is sample data.
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "#",
    },
    {
      title: "World 1",
      items: [
        {
          title: "Temp",
          url: "#",
        },
      ],
    },
    {
      title: "World 2",
      items: [
        {
          title: "Temp",
          url: "#",
        },
      ],
    },
    {
      title: "World 3",
      url: "#",
      items: [
        {
          title: "Temp",
          url: "#",
        },
      ],
    },
    {
      title: "World 4",
      url: "#",
      items: [
        {
          title: "Temp",
          url: "#",
        },
      ],
    },
    {
      title: "World 5",
      url: "#",
      items: [
        {
          title: "Temp",
          url: "#",
        },
      ],
    },
    {
      title: "World 6",
      url: "#",
      items: [
        {
          title: "Temp",
          url: "#",
        },
      ],
    },
    {
      title: "World 7",
      url: "#",
      items: [
        {
          title: "Temp",
          url: "#",
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
            return (
              <SidebarGroup key={item.title}>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>{item.title}</a>
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
                            <a href={subItem.url}>{subItem.title}</a>
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
