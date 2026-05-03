import { Tabs } from "@base-ui/react/tabs";
import { useEffect, useState } from "react";
import {
  Block,
  PageHead,
  RunBtn,
  TermCheckbox,
  TermTabs,
} from "@/components/terminal";
import { DisabledHint } from "@/components/terminal/disabled-hint";
import { useGameData } from "@/providers/game-data-provider";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";
import { UpgradeOptimizer } from "./upgrade-optimizer";

const HOTEW_RESEARCH_LV_REQ = 49;

type ActiveTab = "scripts" | "optimizer";

const TABS = [
  { value: "scripts", label: "scripts" },
  { value: "optimizer", label: "optimizer" },
] as const satisfies readonly { value: ActiveTab; label: string }[];

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

  const { sushiStation } = useGameData();
  const researchLevel = sushiStation?.researchLevel;
  const hotewLocked =
    researchLevel !== undefined && researchLevel < HOTEW_RESEARCH_LV_REQ;
  const hotewLockHint = hotewLocked
    ? `locked - requires research level ${HOTEW_RESEARCH_LV_REQ} (current: ${researchLevel})`
    : null;

  useEffect(() => {
    window.api.app
      .isDev()
      .then(setIsDev)
      .catch(() => setIsDev(false));
  }, []);

  return (
    <>
      <PageHead path="world-7 / sushi-station" title="sushi-station" />
      <TermTabs onValueChange={setActiveTab} tabs={TABS} value={activeTab}>
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
            {(() => {
              const button = (
                <RunBtn
                  disabled={hotewLocked}
                  getArgs={() => [
                    sushiHeatOfTheEastWind.shouldCook,
                    sushiHeatOfTheEastWind.mergeAboveHotew ?? false,
                  ]}
                  label="start loop"
                  scriptId="world7.sushiStation.sushiStationHeatOfTheEastWind"
                />
              );
              return hotewLockHint ? (
                <DisabledHint disabled popover={hotewLockHint}>
                  {button}
                </DisabledHint>
              ) : (
                button
              );
            })()}
          </Block>
          {isDev && (
            <div className="mt-1.5 rounded-[5px] border border-border border-dashed bg-black/20 px-2.5 pt-2 pb-1">
              <div className="mb-1.5 flex items-center gap-2 px-1 font-mono text-[9.5px] text-text-muted uppercase tracking-[0.6px]">
                <span>dev only</span>
                <span className="h-px flex-1 bg-border-soft" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Block
                  dev
                  note="captures filtered cell images for new sushi tier templates."
                  tag="script"
                  title="sushi.merge-debug"
                >
                  <RunBtn
                    label="debug merge"
                    scriptId="world7.sushiStation.sushiStationMergeDebug"
                    small
                  />
                </Block>
                <Block
                  dev
                  note="single sort pass: arranges sushi in descending tier order along the snake. no merging, no cooking."
                  tag="script"
                  title="sushi.sort"
                >
                  <RunBtn
                    label="sort once"
                    scriptId="world7.sushiStation.sushiStationSort"
                    small
                  />
                </Block>
              </div>
            </div>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="optimizer">
          <UpgradeOptimizer />
        </Tabs.Panel>
      </TermTabs>
    </>
  );
};

export default SushiStation;
