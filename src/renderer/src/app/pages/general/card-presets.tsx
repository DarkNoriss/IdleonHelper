import { useState } from "react";
import { ScriptPage } from "@/components/script-page.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { cardPresets } from "@/parsers/card-presets";

const CardPresets = () => {
  const [preset, setPreset] = useState("1");

  return (
    <ScriptPage
      actions={[
        {
          label: "Find Card Slot",
          scriptId: "general.cardPresets.findSlot",
        },
      ]}
      title="Card Presets"
    >
      <div className="mb-4">
        <Select onValueChange={setPreset} value={preset}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cardPresets.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </ScriptPage>
  );
};

export default CardPresets;
