import type React from "react";

import type { NavigationPage } from "./page-ids";

export type { NavigationPage } from "./page-ids";

export const pageRegistry = {
  dashboard: () => import("./pages/dashboard"),
  rawData: () => import("./pages/raw-data"),
  debug: () => import("./pages/debug/index"),
  logs: () => import("./pages/general/logs/index"),
  "general/store-items": () => import("./pages/general/storage/index"),
  "general/candy": () => import("./pages/general/candy/index"),
  "general/boss-farmer": () => import("./pages/general/boss-farmer/index"),
  "general/card-presets": () => import("./pages/general/cards/index"),
  "classSpecific/compass": () => import("./pages/class-specific/compass"),
  "classSpecific/compass-debug": () =>
    import("./pages/class-specific/compass-debug"),
  "classSpecific/tesseract": () => import("./pages/class-specific/tesseract"),
  "classSpecific/grimoire": () => import("./pages/class-specific/grimoire"),
  "world2/weekly-battle": () => import("./pages/world-2/weekly-battle/index"),
  "world2/alchemy-upgrade": () =>
    import("./pages/world-2/alchemy-upgrade/index"),
  "world3/construction": () => import("./pages/world-3/construction/index"),
  "world3/trapping": () => import("./pages/world-3/trapping/index"),
  "world6/farming": () => import("./pages/world-6/farming/index"),
  "world6/summoning": () => import("./pages/world-6/summoning/index"),
  "world6/emperor": () => import("./pages/world-6/emperor/index"),
  "world7/sushi-station": () => import("./pages/world-7/sushi-station/index"),
} as const satisfies Record<
  NavigationPage,
  () => Promise<{ default: React.ComponentType }>
>;
