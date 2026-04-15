import { useEffect, useMemo, useRef, useState } from "react";
import { ScriptPage } from "@/components/script-page.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useMainState } from "@/hooks/use-main-state.ts";
import {
  COMPASS_MINOR_NODE_DEFS,
  COMPASS_NODE_DEFS,
} from "@/shared/compass-config";
import { parseCompassData } from "./compass-parser";

const Compass = () => {
  const [rawData, setRawData] = useState("");
  const queue = useMainState("queue");
  const wasDiscoverRunningRef = useRef(false);

  useEffect(() => {
    const isDiscoverRunning =
      queue?.runningItem?.scriptId === "classSpecific.compass.discover";
    if (wasDiscoverRunningRef.current && !isDiscoverRunning) {
      setRawData("");
    }
    wasDiscoverRunningRef.current = isDiscoverRunning;
  }, [queue?.runningItem?.scriptId]);

  const knownIds = useMemo(() => {
    const ids = new Set(COMPASS_NODE_DEFS.map((n) => n.id));
    for (const minor of COMPASS_MINOR_NODE_DEFS) {
      ids.add(minor.id);
    }
    return ids;
  }, []);

  const validation = useMemo(() => {
    if (!rawData.trim()) {
      return null;
    }
    const parsed = parseCompassData(rawData);
    const missing: string[] = [];

    const findMatch = (name: string): string | undefined => {
      if (knownIds.has(name)) {
        return name;
      }
      for (const id of knownIds) {
        if (id.endsWith(`-${name}`)) {
          return id;
        }
      }
      return undefined;
    };

    for (const upgrade of parsed) {
      if (!findMatch(upgrade.name)) {
        missing.push(upgrade.name);
      }
    }
    return { parsed, missing };
  }, [rawData, knownIds]);

  const hasMissing = validation !== null && validation.missing.length > 0;

  return (
    <ScriptPage
      actions={[
        {
          label: "Start",
          scriptId: "classSpecific.compass.run",
          runningLabel: "Running... (Click to stop)",
          disabled: !validation || hasMissing,
          args: () => [validation!.parsed],
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

      {hasMissing && (
        <div className="mb-4">
          <h3 className="mb-1 font-medium text-red-400 text-sm">
            Missing nodes ({validation.missing.length}) — add these before
            running
          </h3>
          <ul className="list-inside list-disc text-red-300 text-sm">
            {validation.missing.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      )}
    </ScriptPage>
  );
};

export default Compass;
