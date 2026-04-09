import { useState } from "react";
import { ScriptPage } from "@/components/script-page.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

const overgrowthOptions = Array.from({ length: 13 }, (_, i) => ({
  value: String(i),
  label: `>= ${i === 0 ? 0 : 2 ** i}x`,
}));

const Farming = () => {
  const [selectedOvergrowth, setSelectedOvergrowth] = useState("0");

  return (
    <ScriptPage
      actions={[
        {
          label: "Collect Crops",
          scriptId: "world6.farming.farmingCollectCrops",
          runningLabel: "Stop",
          args: () => [Number(selectedOvergrowth)],
        },
        {
          label: "Bean Trading - Get Tickets",
          scriptId: "world6.farming.beanTradingGetTickets",
        },
        {
          label: "Bean Trading - Trade Crops",
          scriptId: "world6.farming.beanTradingTradeCrops",
        },
      ]}
      title="Farming"
    >
      <div className="mb-4">
        <Select
          onValueChange={setSelectedOvergrowth}
          value={selectedOvergrowth}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {overgrowthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </ScriptPage>
  );
};

export default Farming;
