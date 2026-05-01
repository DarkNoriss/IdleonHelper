import { Tabs } from "@base-ui/react/tabs";
import { useEffect, useState } from "react";
import {
  Block,
  BlockActions,
  PageHead,
  RunBtn,
  TermCheckbox,
} from "@/components/terminal";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";
import { UpgradeOptimizer } from "./upgrade-optimizer";

type ActiveTab = "scripts" | "optimizer";

const SCRIPTS_DESCRIPTION =
  "cook and merge sushi to push to higher tiers. each new tier unlocks a permanent rest-of-game bonus and boosts Bucks/hr. scripts here automate the merge board.";
const OPTIMIZER_DESCRIPTION =
  "optimal upgrade order across bucks/hr, fuel rate, fuel cap, or cheapest overall. rows are sorted by efficiency.";

// Base UI's `Tabs.Tab` renders as <button>, so the UA `font` shorthand resets
// font-family + font-size — explicit `font-mono text-sm` here ensures tabs
// render in mono at 14px, intentionally larger than the surrounding `›` / `·`
// chrome so the labels read as the primary control on the strip.
const TAB_CLASS =
  "cursor-pointer border-0 bg-transparent p-0 font-mono text-sm text-text-dim data-[active]:font-medium data-[active]:text-primary data-[active]:underline data-[active]:decoration-primary-dim data-[active]:underline-offset-[3px]";

const SushiStation = () => {
  const [isDev, setIsDev] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("scripts");

  const shouldCook = useUiPrefsStore((s) => s.sushi.shouldCook);
  const setSushi = useUiPrefsStore((s) => s.setSushi);

  const sushiHeatOfTheEastWind = useUiPrefsStore(
    (s) => s.sushiHeatOfTheEastWind
  );
  const setSushiHeatOfTheEastWind = useUiPrefsStore(
    (s) => s.setSushiHeatOfTheEastWind
  );

  useEffect(() => {
    window.api.app
      .isDev()
      .then(setIsDev)
      .catch(() => setIsDev(false));
  }, []);

  const description =
    activeTab === "scripts" ? SCRIPTS_DESCRIPTION : OPTIMIZER_DESCRIPTION;

  return (
    <>
      <PageHead
        descMinLines={2}
        description={description}
        path="world-7 / sushi-station"
        title="sushi-station"
      />
      <Tabs.Root
        className="w-full"
        onValueChange={(v) => setActiveTab(v as ActiveTab)}
        value={activeTab}
      >
        <Tabs.List className="mb-3 flex items-center gap-0 border-border-soft border-b pb-1.5 font-mono text-[10.5px] text-text-muted">
          <span className="mr-1.5 text-primary">›</span>
          <Tabs.Tab className={TAB_CLASS} value="scripts">
            scripts
          </Tabs.Tab>
          <span className="px-1.5 text-text-muted">·</span>
          <Tabs.Tab className={TAB_CLASS} value="optimizer">
            optimizer
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="scripts">
          <Block
            note="open the sushi station in-game. the script reads the board visually and merges pairs it finds."
            tag="script"
            title="sushi.merge"
          >
            <div className="mb-3">
              <TermCheckbox
                checked={shouldCook}
                label="auto-cook on empty board"
                onChange={(v) => setSushi({ shouldCook: v })}
              />
            </div>
            <div className="self-start">
              <RunBtn
                getArgs={() => [shouldCook]}
                label="start merge"
                scriptId="world7.sushiStation.sushiStationMerge"
              />
            </div>
          </Block>
          <Block
            note="in-game buff: combining a sushi tiers-up the one to its right, if it's lower tiered. this script feeds that chain - drains stuck high tiers and seeds merges from the bottom, optionally cooking new sushi between iterations. loops until stopped."
            tag="script"
            title="sushi.heat-of-the-east-wind"
          >
            <div className="mb-3 flex flex-col gap-2">
              <TermCheckbox
                checked={sushiHeatOfTheEastWind.shouldCook}
                label="auto-cook on empty board"
                onChange={(v) => setSushiHeatOfTheEastWind({ shouldCook: v })}
              />
              <TermCheckbox
                checked={sushiHeatOfTheEastWind.mergeAboveHotew ?? false}
                label="merge above HOTEW band"
                onChange={(v) =>
                  setSushiHeatOfTheEastWind({ mergeAboveHotew: v })
                }
              />
            </div>
            <div className="self-start">
              <RunBtn
                getArgs={() => [
                  sushiHeatOfTheEastWind.shouldCook,
                  sushiHeatOfTheEastWind.mergeAboveHotew ?? false,
                ]}
                label="start loop"
                scriptId="world7.sushiStation.sushiStationHeatOfTheEastWind"
              />
            </div>
          </Block>
          {isDev && (
            <div className="mt-1.5 rounded-[5px] border border-border border-dashed bg-black/20 px-2.5 pt-2 pb-1">
              <div className="mb-1.5 flex items-center gap-2 px-1 font-mono text-[9.5px] text-text-muted uppercase tracking-[0.6px]">
                <span>dev only</span>
                <span className="h-px flex-1 bg-border-soft" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Block
                  compact
                  dev
                  note="captures filtered cell images for new sushi tier templates."
                  tag="script"
                  title="sushi.merge-debug"
                >
                  <BlockActions>
                    <RunBtn
                      label="debug merge"
                      scriptId="world7.sushiStation.sushiStationMergeDebug"
                      small
                    />
                  </BlockActions>
                </Block>
                <Block
                  compact
                  dev
                  note="single sort pass: arranges sushi in descending tier order along the snake. no merging, no cooking."
                  tag="script"
                  title="sushi.sort"
                >
                  <BlockActions>
                    <RunBtn
                      label="sort once"
                      scriptId="world7.sushiStation.sushiStationSort"
                      small
                    />
                  </BlockActions>
                </Block>
              </div>
            </div>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="optimizer">
          <UpgradeOptimizer />
        </Tabs.Panel>
      </Tabs.Root>
    </>
  );
};

export default SushiStation;
