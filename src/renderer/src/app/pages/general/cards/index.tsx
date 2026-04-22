import { useEffect } from "react";
import {
  Block,
  BlockActions,
  Field,
  PageHead,
  RunBtn,
  TermSelect,
} from "@/components/terminal";
import { PRESET_CONFIGS } from "@/parsers/card-presets";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";

const DEFAULT_SLOT = "1";

const CardPresets = () => {
  const slot = useUiPrefsStore((s) => s.cards.slot);
  const setCards = useUiPrefsStore((s) => s.setCards);

  useEffect(() => {
    if (!PRESET_CONFIGS.some((p) => String(p.slot) === slot)) {
      setCards({ slot: DEFAULT_SLOT });
    }
  }, [slot, setCards]);

  const options = PRESET_CONFIGS.map((p) => ({
    value: String(p.slot),
    label: `slot ${p.slot} · ${p.name}`,
  }));
  const slotNumber = Number(slot);

  return (
    <>
      <PageHead
        description="Apply or select saved card presets by slot. Useful for switching card layouts between farming setups."
        path="general / card-presets"
        title="card-presets"
      />
      <Block title="cards.config">
        <Field label="preset-slot" width="w-[220px]">
          <TermSelect
            onChange={(v) => setCards({ slot: v })}
            options={options}
            value={slot}
          />
        </Field>
      </Block>
      <div className="grid grid-cols-2 gap-2">
        <Block
          compact
          note="applies the preset to the active character in-game."
          tag="script"
          title="cards.apply"
        >
          <BlockActions>
            <RunBtn
              getArgs={() => [slotNumber]}
              label="apply preset"
              scriptId="general.cardPresets.apply"
            />
          </BlockActions>
        </Block>
        <Block
          compact
          note="selects (highlights) the preset without applying, so you can inspect before committing."
          tag="script"
          title="cards.select"
        >
          <BlockActions>
            <RunBtn
              getArgs={() => [slotNumber]}
              label="select preset"
              scriptId="general.cardPresets.select"
            />
          </BlockActions>
        </Block>
      </div>
    </>
  );
};

export default CardPresets;
