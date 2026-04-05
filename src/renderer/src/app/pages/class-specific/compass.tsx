import { useState } from "react";
import { ScriptPage } from "@/components/script-page";
import { Textarea } from "@/components/ui/textarea";
import { parseCompassData } from "./compass-parser";

const Compass = () => {
  const [rawData, setRawData] = useState("");

  const isEmpty = rawData.trim() === "";

  return (
    <ScriptPage
      actions={[
        {
          label: "Start",
          scriptId: "classSpecific.compass.run",
          runningLabel: "Running... (Click to stop)",
          disabled: isEmpty,
          args: () => [parseCompassData(rawData)],
        },
      ]}
      title="Compass"
    >
      <div className="mb-4">
        <label
          className="mb-1.5 block font-medium text-sm"
          htmlFor="compass-data"
        >
          Compass Data
        </label>
        <Textarea
          id="compass-data"
          onChange={(e) => setRawData(e.target.value)}
          placeholder="Paste compass data here..."
          rows={8}
          value={rawData}
        />
      </div>
    </ScriptPage>
  );
};

export default Compass;
