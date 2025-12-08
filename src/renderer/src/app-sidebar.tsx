import * as React from "react"
import { useUpdateInitializer, useUpdateStore } from "@/stores/update"
import { useWebSocketStore } from "@/stores/ws"
import { ChevronRight, Download, Loader2 } from "lucide-react"
import { Link } from "react-router-dom"

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

// Navigation data with routes
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
    },
    {
      title: "Game Window",
      url: "/game-window",
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
  const { isConnected, error } = useWebSocketStore()
  const {
    status: updateStatus,
    currentVersion,
    latestVersion,
    downloadProgress,
    error: updateError,
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
  } = useUpdateStore()

  // Initialize update checking on mount
  useUpdateInitializer()

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
      <SidebarFooter className="border-sidebar-border border-t p-4">
        <div className="flex flex-col gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div
              className={`size-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sidebar-foreground text-sm font-medium">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          {!isConnected && error && (
            <p className="text-sidebar-foreground/70 text-xs">{error}</p>
          )}
          {!isConnected && !error && (
            <p className="text-sidebar-foreground/70 text-xs">
              Connecting to backend...
            </p>
          )}

          {/* Update Status */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {updateStatus === "checking" && (
                <Loader2 className="text-sidebar-foreground/70 size-3 animate-spin" />
              )}
              {updateStatus === "update-available" && (
                <Download className="text-sidebar-foreground/70 size-3" />
              )}
              {updateStatus === "downloading" && (
                <Loader2 className="text-sidebar-foreground/70 size-3 animate-spin" />
              )}
              {updateStatus === "up-to-date" && (
                <div className="size-2 rounded-full bg-green-500" />
              )}
              {updateStatus === "downloaded" && (
                <div className="size-2 rounded-full bg-blue-500" />
              )}
              {updateStatus === "error" && (
                <div className="size-2 rounded-full bg-red-500" />
              )}
              <span className="text-sidebar-foreground text-xs">
                v{currentVersion}
              </span>
            </div>

            {/* Update Status Text */}
            {updateStatus === "checking" && (
              <p className="text-sidebar-foreground/70 text-xs">
                Checking for updates...
              </p>
            )}
            {updateStatus === "up-to-date" && (
              <p className="text-sidebar-foreground/70 text-xs">Up to date</p>
            )}
            {updateStatus === "update-available" && (
              <button
                onClick={downloadUpdate}
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground text-left text-xs underline transition-colors"
              >
                Update available (v{latestVersion})
              </button>
            )}
            {updateStatus === "downloading" && (
              <div className="flex flex-col gap-1">
                <p className="text-sidebar-foreground/70 text-xs">
                  Downloading update...
                </p>
                {downloadProgress !== null && (
                  <div className="bg-sidebar-border h-1 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-sidebar-accent h-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            {updateStatus === "downloaded" && (
              <button
                onClick={quitAndInstall}
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground text-left text-xs underline transition-colors"
              >
                Restart to install update
              </button>
            )}
            {updateStatus === "error" && updateError && (
              <div className="flex flex-col gap-1">
                <p className="text-sidebar-foreground/70 text-xs">
                  Update check failed
                </p>
                <button
                  onClick={checkForUpdates}
                  className="text-sidebar-foreground/70 hover:text-sidebar-foreground text-left text-xs underline transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
