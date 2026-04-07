import { useState } from "react";
import { ScriptPage } from "@/components/script-page.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { PRESET_CONFIGS } from "@/parsers/card-presets";

const CardPresets = () => {
  const [slot, setSlot] = useState("1");

  return (
    <ScriptPage
      actions={[
        {
          label: "Apply Preset",
          scriptId: "general.cardPresets.apply",
          args: () => [Number(slot)],
        },
      ]}
      title="Card Presets"
    >
      <div className="mb-4">
        <Select onValueChange={setSlot} value={slot}>
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
