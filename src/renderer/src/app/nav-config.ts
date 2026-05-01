import type { NavigationPage } from "./page-ids";

type NavItem = {
  title: string;
  page: NavigationPage;
  devOnly?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type NavEntry = NavItem | NavGroup;

export const navConfig: NavEntry[] = [
  { title: "dashboard", page: "dashboard" },
  { title: "raw-data", page: "rawData", devOnly: true },
  { title: "debug", page: "debug", devOnly: true },
  {
    title: "general",
    items: [
      { title: "logs", page: "logs" },
      { title: "store-items", page: "general/store-items" },
      { title: "candy", page: "general/candy" },
      { title: "boss-farmer", page: "general/boss-farmer" },
      { title: "card-presets", page: "general/card-presets" },
    ],
  },
  {
    title: "class-specific",
    items: [
      { title: "grimoire", page: "classSpecific/grimoire" },
      { title: "compass", page: "classSpecific/compass" },
      {
        title: "compass-debug",
        page: "classSpecific/compass-debug",
        devOnly: true,
      },
      { title: "tesseract", page: "classSpecific/tesseract" },
    ],
  },
  {
    title: "world-2",
    items: [
      { title: "weekly-battle", page: "world2/weekly-battle" },
      { title: "alchemy-upgrade", page: "world2/alchemy-upgrade" },
    ],
  },
  {
    title: "world-3",
    items: [
      { title: "construction", page: "world3/construction" },
      { title: "trapping", page: "world3/trapping" },
    ],
  },
  {
    title: "world-6",
    items: [
      { title: "summoning", page: "world6/summoning" },
      { title: "farming", page: "world6/farming" },
    ],
  },
  {
    title: "world-7",
    items: [{ title: "sushi-station", page: "world7/sushi-station" }],
  },
];
