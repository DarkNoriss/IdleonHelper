import { useEffect, useState } from "react";
import type { ScriptAction } from "@/components/script-page.tsx";
import { ScriptPage } from "@/components/script-page.tsx";

const SushiStation = () => {
  const [isDev, setIsDev] = useState(false);

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

  return <ScriptPage actions={actions} title="Sushi Station" />;
};

export default SushiStation;
