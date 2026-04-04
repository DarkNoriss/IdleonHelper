import type { NavigationPage } from "./page-registry";

type NavGroup = {
  title: string;
  items: { title: string; page: NavigationPage; devOnly?: boolean }[];
};

type NavEntry = { title: string; page: NavigationPage } | NavGroup;

export const navConfig: NavEntry[] = [
  { title: "Dashboard", page: "dashboard" },
  { title: "Raw Data", page: "rawData" },
  {
    title: "General",
    items: [
      { title: "Logs", page: "logs" },
      { title: "Store Items", page: "general/store-items" },
      { title: "Candy", page: "general/candy" },
      { title: "Boss Farmer", page: "general/boss-farmer" },
      { title: "Test", page: "general/test", devOnly: true },
    ],
  },
  {
    title: "World 2",
    items: [{ title: "Weekly Battle", page: "world2/weekly-battle" }],
  },
  {
    title: "World 3",
    items: [
      { title: "Construction", page: "world3/construction" },
      { title: "Trapping", page: "world3/trapping" },
    ],
  },
  {
    title: "World 6",
    items: [
      { title: "Summoning", page: "world6/summoning" },
      { title: "Farming", page: "world6/farming" },
    ],
  },
];
