import type React from "react";

export const pageRegistry = {
  dashboard: () => import("./pages/dashboard"),
  rawData: () => import("./pages/raw-data"),
  logs: () => import("./pages/general/logs"),
  "general/store-items": () => import("./pages/general/store-items"),
  "general/candy": () => import("./pages/general/candy"),
  "general/boss-farmer": () => import("./pages/general/boss-farmer"),
  "general/test": () => import("./pages/general/test"),
  "world2/weekly-battle": () => import("./pages/world-2/weekly-battle"),
  "world3/construction": () => import("./pages/world-3/construction"),
  "world3/trapping": () => import("./pages/world-3/trapping"),
  "world6/farming": () => import("./pages/world-6/farming"),
  "world6/summoning": () => import("./pages/world-6/summoning"),
} as const satisfies Record<
  string,
  () => Promise<{ default: React.ComponentType }>
>;

export type NavigationPage = keyof typeof pageRegistry;
