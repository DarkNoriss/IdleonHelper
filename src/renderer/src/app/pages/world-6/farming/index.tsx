import { useEffect, useState } from "react";
import type { ScriptAction } from "@/components/script-page.tsx";
import { ScriptPage } from "@/components/script-page.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

const overgrowthOptions = Array.from({ length: 19 }, (_, i) => ({
  value: String(i),
  label: `>= ${i === 0 ? 0 : 2 ** i}x`,
}));

const Farming = () => {
  const [selectedOvergrowth, setSelectedOvergrowth] = useState("0");
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    window.api.app
      .isDev()
      .then(setIsDev)
      .catch(() => setIsDev(false));
  }, []);

  const actions: ScriptAction[] = [
    {
      label: "Collect Crops",
      scriptId: "world6.farming.farmingCollectCrops",
      runningLabel: "Stop",
      args: () => [Number(selectedOvergrowth)],
    },
    ...(isDev
      ? [
          {
            label: "Collect Crops Debug",
            scriptId: "world6.farming.farmingCollectCropsDebug",
          } satisfies ScriptAction,
        ]
      : []),
    {
      label: "Bean Trading - Get Tickets",
      scriptId: "world6.farming.beanTradingGetTickets",
    },
    {
      label: "Bean Trading - Trade Crops",
      scriptId: "world6.farming.beanTradingTradeCrops",
    },
  ];

  return (
    <ScriptPage actions={actions} title="Farming">
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
