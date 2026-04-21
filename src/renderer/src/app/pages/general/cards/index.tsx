import { useEffect } from "react";
import { ScriptPage } from "@/components/script-page.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
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

  return (
    <ScriptPage
      actions={[
        {
          label: "Apply Preset",
          scriptId: "general.cardPresets.apply",
          args: () => [Number(slot)],
        },
        {
          label: "Select Preset",
          scriptId: "general.cardPresets.select",
          args: () => [Number(slot)],
        },
      ]}
      title="Card Presets"
    >
      <div className="mb-4">
        <Select
          onValueChange={(v) => v !== null && setCards({ slot: v })}
          value={slot}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESET_CONFIGS.map((p) => (
              <SelectItem key={p.slot} value={String(p.slot)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </ScriptPage>
  );
};

export default CardPresets;
