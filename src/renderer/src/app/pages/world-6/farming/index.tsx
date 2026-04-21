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

  const actions: ScriptAction[] = [
    {
      label: "Collect Crops",
      scriptId: "world6.farming.farmingCollectCrops",
      runningLabel: "Stop",
      args: () => [Number(overgrowth)],
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
          onValueChange={(v) => v !== null && setFarming({ overgrowth: v })}
          value={overgrowth}
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
