import { Tabs } from "@base-ui/react/tabs";
import { useEffect, useState } from "react";
import { Block, PageHead, RunBtn, TermCheckbox } from "@/components/terminal";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";
import { UpgradeOptimizer } from "./upgrade-optimizer";

const SushiStation = () => {
  const [isDev, setIsDev] = useState(false);
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

  return (
    <Tabs.Root className="w-full" defaultValue="scripts">
      <Tabs.List className="mb-4 flex gap-1 border-border border-b pb-0">
        <Tabs.Tab
          className="cursor-pointer border-transparent border-b-2 px-3 py-1.5 font-mono text-[11px] text-text-dim transition-colors hover:text-foreground data-[active]:border-primary data-[active]:text-foreground"
          value="scripts"
        >
          Scripts
        </Tabs.Tab>
        <Tabs.Tab
          className="cursor-pointer border-transparent border-b-2 px-3 py-1.5 font-mono text-[11px] text-text-dim transition-colors hover:text-foreground data-[active]:border-primary data-[active]:text-foreground"
          value="optimizer"
        >
          Upgrade Optimizer
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="scripts">
        <PageHead
          description="cook and merge sushi to push to higher tiers. each new tier unlocks a permanent rest-of-game bonus and boosts Bucks/hr. scripts here automate the merge board."
          path="world-7 / sushi-station"
          title="sushi-station"
        />
        <Block
          note="open the sushi station in-game. the script reads the board visually and merges pairs it finds."
          tag="script"
          title="sushi.merge"
        >
          <div className="mb-3">
            <TermCheckbox
              checked={shouldCook}
              label="spawn new sushi when no pairs found"
              onChange={(v) => setSushi({ shouldCook: v })}
            />
          </div>
          <RunBtn
            getArgs={() => [shouldCook]}
            label="start merge"
            scriptId="world7.sushiStation.sushiStationMerge"
          />
        </Block>
        <Block
          note="in-game buff: combining a sushi tiers-up the one to its right, if it's lower tiered. this script feeds that chain - drains stuck high tiers and seeds merges from the bottom, optionally cooking new sushi between iterations. loops until stopped."
          tag="script"
          title="sushi.heat-of-the-east-wind"
        >
          <div className="mb-3 space-y-2">
            <TermCheckbox
              checked={sushiHeatOfTheEastWind.shouldCook}
              label="spawn new sushi when no pairs found"
              onChange={(v) => setSushiHeatOfTheEastWind({ shouldCook: v })}
            />
            <TermCheckbox
              checked={sushiHeatOfTheEastWind.mergeAboveHotew ?? false}
              label="merge tiers above HOTEW band (max tier - 6)"
              onChange={(v) =>
                setSushiHeatOfTheEastWind({ mergeAboveHotew: v })
              }
            />
          </div>
          <RunBtn
            getArgs={() => [
              sushiHeatOfTheEastWind.shouldCook,
              sushiHeatOfTheEastWind.mergeAboveHotew ?? false,
            ]}
            label="run once"
            scriptId="world7.sushiStation.sushiStationHeatOfTheEastWind"
          />
        </Block>
        {isDev && (
          <Block
            dev
            note="captures filtered cell images for new sushi tier templates."
            tag="script"
            title="sushi.merge-debug"
          >
            <RunBtn
              label="debug merge"
              scriptId="world7.sushiStation.sushiStationMergeDebug"
            />
          </Block>
        )}
        {isDev && (
          <Block
            dev
            note="performs a single sort pass over the board: arranges sushi in descending tier order along the snake. no merging, no cooking, exits when sorted."
            tag="script"
            title="sushi.sort"
          >
            <RunBtn
              label="sort once"
              scriptId="world7.sushiStation.sushiStationSort"
            />
          </Block>
        )}
      </Tabs.Panel>
      <Tabs.Panel value="optimizer">
        <UpgradeOptimizer />
      </Tabs.Panel>
    </Tabs.Root>
  );
};

export default SushiStation;
