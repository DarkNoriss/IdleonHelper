// Page ID constants.
// Declared separately from page-registry.ts so the navigation store can
// import the type without creating an import cycle.

export const PAGE_IDS = [
  "dashboard",
  "rawData",
  "debug",
  "logs",
  "general/store-items",
  "general/candy",
  "general/boss-farmer",
  "general/card-presets",
  "classSpecific/compass",
  "classSpecific/compass-debug",
  "classSpecific/tesseract",
  "classSpecific/grimoire",
  "world2/weekly-battle",
  "world2/alchemy-upgrade",
  "world3/construction",
  "world3/trapping",
  "world6/farming",
  "world6/summoning",
  "world7/sushi-station",
] as const;

export type NavigationPage = (typeof PAGE_IDS)[number];
