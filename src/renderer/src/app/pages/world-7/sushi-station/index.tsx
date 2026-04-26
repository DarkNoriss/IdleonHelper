import { useEffect, useState } from "react";
import { Block, PageHead, RunBtn, TermCheckbox } from "@/components/terminal";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";

const SushiStation = () => {
  const [isDev, setIsDev] = useState(false);
  const shouldCook = useUiPrefsStore((s) => s.sushi.shouldCook);
  const setSushi = useUiPrefsStore((s) => s.setSushi);

  const maxBuff = useUiPrefsStore((s) => s.sushiMaxBuff);
  const setSushiMaxBuff = useUiPrefsStore((s) => s.setSushiMaxBuff);

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
        note="arranges sushi in descending tier order along the snake so each merge tier-ups the right neighbor (Wind of the East). highest tier auto-detected from the board each iteration."
        tag="script"
        title="sushi.heat-of-the-east-win"
      >
        <div className="mb-3">
          <TermCheckbox
            checked={maxBuff.shouldCook}
            label="spawn new sushi when no pairs found"
            onChange={(v) => setSushiMaxBuff({ shouldCook: v })}
          />
        </div>
        <RunBtn
          getArgs={() => [maxBuff.shouldCook]}
          label="start max-buff merge"
          scriptId="world7.sushiStation.sushiStationMaxBuffMerge"
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
    </>
  );
};

export default SushiStation;
