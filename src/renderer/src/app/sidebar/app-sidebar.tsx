import { useEffect, useMemo, useState } from "react";
import { navConfig } from "@/app/nav-config";
import type { NavigationPage } from "@/app/page-ids";
import { useMainState } from "@/hooks/use-main-state";
import { cn } from "@/lib/utils";
import { useNavigationStore } from "@/store/navigation";

import { UpdateFooter } from "./update-footer";

// Map page → script id prefix(es) so the sidebar can show a pulsing dot on
// the page whose script is currently running. A page can own multiple prefixes
// when its scripts live under more than one namespace (e.g. the debug page
// borrows the compass stress-test).
const PAGE_SCRIPT_PREFIXES: Partial<Record<NavigationPage, readonly string[]>> =
  {
    debug: ["general.debug.", "classSpecific.compass.stressTestNav"],
    "general/store-items": ["general.storeItems."],
    "general/candy": ["general.candy."],
    "general/boss-farmer": ["general.bossFarmer."],
    "general/card-presets": ["general.cardPresets."],
    "classSpecific/compass": ["classSpecific.compass."],
    "classSpecific/compass-debug": ["classSpecific.compass."],
    "world2/weekly-battle": ["world2.weeklyBattle."],
    "world2/alchemy-upgrade": ["world2.alchemyUpgrade."],
    "world3/construction": ["world3.construction."],
    "world3/trapping": ["world3.trapping."],
    "world6/farming": ["world6.farming."],
    "world6/summoning": ["world6.summoning."],
    "world7/sushi-station": ["world7.sushiStation."],
  };

// Longest-prefix-wins resolution: when two pages both match the running id
// (e.g. debug's "classSpecific.compass.stressTestNav" vs compass's
// "classSpecific.compass."), the more specific owner pulses exclusively.
const findOwnerPage = (runningId: string): NavigationPage | null => {
  let owner: NavigationPage | null = null;
  let longestLen = 0;
  for (const [page, prefixes] of Object.entries(PAGE_SCRIPT_PREFIXES) as [
    NavigationPage,
    readonly string[],
  ][]) {
    for (const prefix of prefixes) {
      if (runningId.startsWith(prefix) && prefix.length > longestLen) {
        longestLen = prefix.length;
        owner = page;
      }
    }
  }
  return owner;
};

const isPageRunning = (
  page: NavigationPage,
  runningId: string | undefined
): boolean => (runningId ? findOwnerPage(runningId) === page : false);

// All groups start collapsed — user opens the ones they need.
const DEFAULT_OPEN_GROUPS = new Set<string>();

export const AppSidebar = () => {
  const currentPage = useNavigationStore((state) => state.currentPage);
  const setPage = useNavigationStore((state) => state.setPage);
  const queue = useMainState("queue");
  const runningId = queue?.runningItem?.scriptId;

  const [isDev, setIsDev] = useState(false);
  useEffect(() => {
    window.api.app
      .isDev()
      .then(setIsDev)
      .catch(() => setIsDev(false));
  }, []);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      navConfig
        .filter((e) => "items" in e)
        .map((e) => [e.title, DEFAULT_OPEN_GROUPS.has(e.title)])
    )
  );

  const toggleGroup = (title: string) =>
    setOpenGroups((s) => ({ ...s, [title]: !s[title] }));

  const entries = useMemo(
    () =>
      navConfig
        .filter((entry) => "items" in entry || !entry.devOnly || isDev)
        .map((entry) => {
          if (!("items" in entry)) {
            return entry;
          }
          const visible = entry.items.filter((i) => !i.devOnly || isDev);
          return { ...entry, items: visible };
        }),
    [isDev]
  );

  return (
    <aside className="flex w-[180px] shrink-0 flex-col border-border border-r bg-panel font-mono">
      <div className="border-border-soft border-b px-2.5 py-2 pb-1.5 text-[9px] text-text-muted uppercase tracking-[1.3px]">
        — nav —
      </div>

      <nav className="flex-1 overflow-auto p-1">
        {entries.map((entry) => {
          if (!("items" in entry)) {
            const active = currentPage === entry.page;
            const running = isPageRunning(entry.page, runningId);
            return (
              <NavButton
                active={active}
                dev={entry.devOnly}
                key={entry.title}
                onClick={() => setPage(entry.page)}
                running={running}
                title={entry.title}
              />
            );
          }

          if (entry.items.length === 0) {
            return null;
          }

          const open = openGroups[entry.title] ?? false;

          return (
            <div className="mt-1" key={entry.title}>
              <button
                className="flex w-full cursor-pointer items-center gap-1.5 border-none bg-transparent px-1.5 py-0.5 text-left font-mono text-[10px] text-text-muted"
                onClick={() => toggleGroup(entry.title)}
                type="button"
              >
                <span className="w-2 text-primary-dim">{open ? "▾" : "▸"}</span>
                <span>{entry.title}/</span>
              </button>
              {open &&
                entry.items.map((item) => {
                  const active = currentPage === item.page;
                  const running = isPageRunning(item.page, runningId);
                  return (
                    <NavButton
                      active={active}
                      dev={item.devOnly}
                      indent
                      key={item.page}
                      onClick={() => setPage(item.page)}
                      running={running}
                      title={item.title}
                    />
                  );
                })}
            </div>
          );
        })}
      </nav>

      <UpdateFooter />
    </aside>
  );
};

type NavButtonProps = {
  title: string;
  active: boolean;
  onClick: () => void;
  indent?: boolean;
  dev?: boolean;
  running?: boolean;
};

const NavButton = ({
  title,
  active,
  onClick,
  indent,
  dev,
  running,
}: NavButtonProps) => (
  <button
    className={cn(
      "mb-px flex w-full cursor-pointer items-center rounded-none border-l-2 border-none py-0.5 pr-1.5 pl-1.5 text-left text-[11px] transition-colors",
      active
        ? "border-primary bg-surface text-foreground"
        : "border-transparent text-text-dim hover:text-foreground",
      indent && "pl-[18px]"
    )}
    onClick={onClick}
    type="button"
  >
    <span
      className={cn(
        "mr-1.5 inline-block w-2",
        active ? "text-primary" : "text-text-muted"
      )}
    >
      {active ? "▸" : " "}
    </span>
    <span className="flex-1">{title}</span>
    {dev && (
      <span className="mr-1 rounded-sm border border-border-soft px-[3px] text-[8px] text-warn tracking-[0.5px]">
        dev
      </span>
    )}
    {running && (
      <span className="inline-block h-[5px] w-[5px] animate-v3pulse rounded-full bg-primary" />
    )}
  </button>
);
