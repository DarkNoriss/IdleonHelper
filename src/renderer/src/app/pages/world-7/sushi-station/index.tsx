import { useEffect, useState } from "react";
import type { ScriptAction } from "@/components/script-page.tsx";
import { ScriptPage } from "@/components/script-page.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";

const SushiStation = () => {
  const [isDev, setIsDev] = useState(false);
  const shouldCook = useUiPrefsStore((s) => s.sushi.shouldCook);
  const setSushi = useUiPrefsStore((s) => s.setSushi);

  useEffect(() => {
    window.api.app
      .isDev()
      .then(setIsDev)
      .catch(() => setIsDev(false));
  }, []);

  const actions: ScriptAction[] = [
    {
      label: "Merge Sushi",
      scriptId: "world7.sushiStation.sushiStationMerge",
      runningLabel: "Stop",
      args: () => [shouldCook],
    },
    ...(isDev
      ? [
          {
            label: "Debug",
            scriptId: "world7.sushiStation.sushiStationMergeDebug",
          } satisfies ScriptAction,
        ]
      : []),
  ];

  return (
    <ScriptPage actions={actions} title="Sushi Station">
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm" htmlFor="cook">
          <Checkbox
            checked={shouldCook}
            id="cook"
            onCheckedChange={(v) => setSushi({ shouldCook: v === true })}
          />
          Spawn new sushi when no pairs found
        </label>
      </div>
    </ScriptPage>
  );
};

export default SushiStation;
