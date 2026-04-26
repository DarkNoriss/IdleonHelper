import { useEffect, useMemo, useState } from "react";
import {
  Block,
  Field,
  PageHead,
  RunBtn,
  TermCheckbox,
  TermSelect,
} from "@/components/terminal";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";

const TIER_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const value = String(i + 1);
  return { value, label: `T${value}` };
});

const SushiStation = () => {
  const [isDev, setIsDev] = useState(false);
  const shouldCook = useUiPrefsStore((s) => s.sushi.shouldCook);
  const setSushi = useUiPrefsStore((s) => s.setSushi);

  const maxBuff = useUiPrefsStore((s) => s.sushiMaxBuff);
  const setSushiMaxBuff = useUiPrefsStore((s) => s.setSushiMaxBuff);

  const highestTierNum = Number.parseInt(maxBuff.highestTier, 10);
  const buffCap = useMemo(
    () => (Number.isFinite(highestTierNum) ? highestTierNum - 6 : null),
    [highestTierNum]
  );

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
        note="arranges sushi in descending tier order along the snake so each merge tier-ups the right neighbor (Wind of the East). pick your highest tier so we know the buff cap."
        tag="script"
        title="sushi.merge-max-buff"
      >
        <div className="mb-3 flex items-end gap-2.5">
          <Field label="highest sushi tier" width="w-[140px]">
            <TermSelect
              onChange={(v) => setSushiMaxBuff({ highestTier: v })}
              options={TIER_OPTIONS}
              value={maxBuff.highestTier}
            />
          </Field>
          <span className="pb-[6px] font-mono text-[10px] text-text-muted">
            {buffCap !== null && buffCap >= 1
              ? `buff applies to tier <= T${buffCap}`
              : "buff inactive (need higher tier)"}
          </span>
        </div>
        <div className="mb-3">
          <TermCheckbox
            checked={maxBuff.shouldCook}
            label="spawn new sushi when no pairs found"
            onChange={(v) => setSushiMaxBuff({ shouldCook: v })}
          />
        </div>
        <RunBtn
          getArgs={() => [highestTierNum, maxBuff.shouldCook]}
          label="start max-buff merge"
          scriptId="world7.sushiStation.sushiStationMaxBuffMerge"
        />
      </Block>
      {isDev && (
        <Block
          note="visualizes the board the merge script sees. dev-only."
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
