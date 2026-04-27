import { useEffect, useState } from "react";
import { Block, PageHead, RunBtn, TermCheckbox } from "@/components/terminal";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";

const SushiStation = () => {
  const [isDev, setIsDev] = useState(false);
  const shouldCook = useUiPrefsStore((s) => s.sushi.shouldCook);
  const setSushi = useUiPrefsStore((s) => s.setSushi);

  const sushiHotewV2 = useUiPrefsStore((s) => s.sushiHotewV2);
  const setSushiHotewV2 = useUiPrefsStore((s) => s.setSushiHotewV2);

  useEffect(() => {
    window.api.app
      .isDev()
      .then(setIsDev)
      .catch(() => setIsDev(false));
  }, []);

  return (
    <>
      <PageHead
        description="Merges matching sushi pieces on the board, optionally spawning new ones when no pairs remain."
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
        note="drains stuck multi-piece tiers above lowest+1, seeds the climb at lowest+1, optionally cooks new sushi between iterations. loops until stopped."
        tag="script"
        title="sushi.hotew-v2"
      >
        <div className="mb-3">
          <TermCheckbox
            checked={sushiHotewV2.shouldCook}
            label="spawn new sushi when no pairs found"
            onChange={(v) => setSushiHotewV2({ shouldCook: v })}
          />
        </div>
        <RunBtn
          getArgs={() => [sushiHotewV2.shouldCook]}
          label="run once"
          scriptId="world7.sushiStation.sushiStationHotewV2"
        />
      </Block>
      {isDev && (
        <Block
          note="captures filtered cell images for new sushi tier templates. dev-only."
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
          note="performs a single sort pass over the board: arranges sushi in descending tier order along the snake. no merging, no cooking, exits when sorted. dev-only."
          tag="script"
          title="sushi.sort"
        >
          <RunBtn
            label="sort once"
            scriptId="world7.sushiStation.sushiStationSort"
          />
        </Block>
      )}
    </>
  );
};

export default SushiStation;
