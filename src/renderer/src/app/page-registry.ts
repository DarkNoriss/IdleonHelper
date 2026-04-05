import type React from "react";

export const pageRegistry = {
  dashboard: () => import("./pages/dashboard.tsx"),
  rawData: () => import("./pages/raw-data.tsx"),
  logs: () => import("./pages/general/logs.tsx"),
  "general/store-items": () => import("./pages/general/store-items.tsx"),
  "general/candy": () => import("./pages/general/candy.tsx"),
  "general/boss-farmer": () => import("./pages/general/boss-farmer.tsx"),
  "general/test": () => import("./pages/general/test.tsx"),
  "world2/weekly-battle": () => import("./pages/world-2/weekly-battle.tsx"),
  "world3/construction": () => import("./pages/world-3/construction.tsx"),
  "world3/trapping": () => import("./pages/world-3/trapping.tsx"),
  "classSpecific/compass": () => import("./pages/class-specific/compass.tsx"),
  "classSpecific/compass-debug": () =>
    import("./pages/class-specific/compass-debug.tsx"),
  "world6/farming": () => import("./pages/world-6/farming.tsx"),
  "world6/summoning": () => import("./pages/world-6/summoning.tsx"),
} as const satisfies Record<
  string,
  () => Promise<{ default: React.ComponentType }>
>;

export type NavigationPage = keyof typeof pageRegistry;
