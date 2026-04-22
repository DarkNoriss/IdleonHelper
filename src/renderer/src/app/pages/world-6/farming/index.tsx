import { useEffect, useState } from "react";
import {
  Block,
  BlockActions,
  Field,
  PageHead,
  RunBtn,
  TermSelect,
} from "@/components/terminal";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";

const overgrowthOptions = Array.from({ length: 19 }, (_, i) => ({
  value: String(i),
  label: `>= ${i === 0 ? 0 : 2 ** i}x`,
}));

const DEFAULT_OVERGROWTH = "0";

const Farming = () => {
  const overgrowth = useUiPrefsStore((s) => s.farming.overgrowth);
  const setFarming = useUiPrefsStore((s) => s.setFarming);
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    if (!overgrowthOptions.some((o) => o.value === overgrowth)) {
      setFarming({ overgrowth: DEFAULT_OVERGROWTH });
    }
  }, [overgrowth, setFarming]);

  useEffect(() => {
    window.api.app
      .isDev()
      .then(setIsDev)
      .catch(() => setIsDev(false));
  }, []);

  return (
    <>
      <PageHead
        description="Collect crops with an overgrowth threshold, and run bean-trading cycles for tickets and crop trades."
        path="world-6 / farming"
        title="farming"
      />
      <Block
        compact
        note="only harvests plots that reached the selected overgrowth multiplier. set to >=0x to collect everything."
        tag="script"
        title="farming.collect-crops"
      >
        <div className="flex items-end gap-2.5">
          <Field label="overgrowth" width="w-[140px]">
            <TermSelect
              onChange={(v) => setFarming({ overgrowth: v })}
              options={overgrowthOptions}
              value={overgrowth}
            />
          </Field>
          <RunBtn
            getArgs={() => [Number(overgrowth)]}
            label="collect crops"
            scriptId="world6.farming.farmingCollectCrops"
          />
          {isDev && (
            <RunBtn
              label="debug"
              scriptId="world6.farming.farmingCollectCropsDebug"
              small
            />
          )}
        </div>
      </Block>
      <div className="grid grid-cols-2 gap-2">
        <Block
          compact
          note="buys tickets from the bean vendor."
          title="bean-trading.tickets"
        >
          <BlockActions>
            <RunBtn
              label="get tickets"
              scriptId="world6.farming.beanTradingGetTickets"
              small
            />
          </BlockActions>
        </Block>
        <Block
          compact
          note="trades crops at the vendor for goods and reroll currency."
          title="bean-trading.trade"
        >
          <BlockActions>
            <RunBtn
              label="trade crops"
              scriptId="world6.farming.beanTradingTradeCrops"
              small
            />
          </BlockActions>
        </Block>
      </div>
    </>
  );
};

export default Farming;
