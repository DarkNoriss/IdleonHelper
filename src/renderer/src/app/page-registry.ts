import type React from "react";

export const pageRegistry = {
  dashboard: () => import("./pages/dashboard"),
  rawData: () => import("./pages/raw-data"),
  logs: () => import("./pages/general/logs/index"),
  "general/store-items": () => import("./pages/general/storage/index"),
  "general/candy": () => import("./pages/general/candy/index"),
  "general/boss-farmer": () => import("./pages/general/boss-farmer/index"),
  "general/card-presets": () => import("./pages/general/cards/index"),
  "general/debug": () => import("./pages/general/debug/index"),
  "world2/weekly-battle": () => import("./pages/world-2/weekly-battle/index"),
  "world3/construction": () => import("./pages/world-3/construction/index"),
  "world3/trapping": () => import("./pages/world-3/trapping/index"),
  "classSpecific/compass": () => import("./pages/class-specific/compass"),
  "classSpecific/compass-debug": () =>
    import("./pages/class-specific/compass-debug"),
  "world6/farming": () => import("./pages/world-6/farming/index"),
  "world6/summoning": () => import("./pages/world-6/summoning/index"),
  "world7/sushi-station": () => import("./pages/world-7/sushi-station/index"),
} as const satisfies Record<
  string,
  () => Promise<{ default: React.ComponentType }>
>;

export type NavigationPage = keyof typeof pageRegistry;
