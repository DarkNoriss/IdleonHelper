import { useMemo, useState } from "react";
import { ScriptPage } from "@/components/script-page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  COMPASS_MINOR_NODE_DEFS,
  COMPASS_NODE_DEFS,
} from "@/shared/compass-config";
import { parseCompassData } from "./compass-parser";

const CompassDebug = () => {
  const [selectedNode, setSelectedNode] = useState("");
  const [rawData, setRawData] = useState("");

  const knownIds = useMemo(() => {
    const ids = new Set(COMPASS_NODE_DEFS.map((n) => n.id));
    for (const minor of COMPASS_MINOR_NODE_DEFS) {
      ids.add(minor.id);
    }
    return ids;
  }, []);

  const auditResult = useMemo(() => {
    if (!rawData.trim()) {
      return null;
    }
    const parsed = parseCompassData(rawData);
    const found: string[] = [];
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
      const match = findMatch(upgrade.name);
      if (match) {
        found.push(match);
      } else {
        missing.push(upgrade.name);
      }
    }
    return { found, missing };
  }, [rawData, knownIds]);

  return (
    <ScriptPage
      actions={[
        {
          label: "Discover Neighbors",
          scriptId: "classSpecific.compass.discover",
          runningLabel: "Discovering... (Click to stop)",
          disabled: !selectedNode,
          args: () => [selectedNode],
        },
        {
          label: "Discover All",
          scriptId: "classSpecific.compass.discoverAll",
          runningLabel: "Discovering All... (Click to stop)",
        },
        {
          label: "Debug Minor Nodes",
          scriptId: "classSpecific.compass.minorDebug",
          runningLabel: "Scanning... (Click to stop)",
          disabled: !selectedNode,
          args: () => [selectedNode],
        },
        {
          label: "Calibrate Center",
          scriptId: "classSpecific.compass.calibrate",
          runningLabel: "Calibrating... (Click to stop)",
        },
      ]}
      title="Compass Debug"
    >
      <div className="mb-4">
        <label
          className="mb-1.5 block font-medium text-sm"
          htmlFor="node-select"
        >
          Node to Center
        </label>
        <Select onValueChange={setSelectedNode} value={selectedNode}>
          <SelectTrigger id="node-select">
            <SelectValue placeholder="Select a node..." />
          </SelectTrigger>
          <SelectContent>
            {COMPASS_NODE_DEFS.map((node) => (
              <SelectItem key={node.id} value={node.id}>
                {node.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4">
        <label
          className="mb-1.5 block font-medium text-sm"
          htmlFor="audit-data"
        >
          Image Audit — Paste compass data to check for missing images
        </label>
        <Textarea
          id="audit-data"
          onChange={(e) => setRawData(e.target.value)}
          placeholder="Paste compass data here..."
          rows={6}
          value={rawData}
        />
      </div>

      {auditResult && (
        <div className="space-y-3">
          {auditResult.missing.length > 0 && (
            <div>
              <h3 className="mb-1 font-medium text-red-400 text-sm">
                Missing ({auditResult.missing.length})
              </h3>
              <ul className="list-inside list-disc text-red-300 text-sm">
                {auditResult.missing.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          )}
          {auditResult.found.length > 0 && (
            <div>
              <h3 className="mb-1 font-medium text-green-400 text-sm">
                Found ({auditResult.found.length})
              </h3>
              <ul className="list-inside list-disc text-green-300 text-sm">
                {auditResult.found.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          )}
          {auditResult.missing.length === 0 && (
            <p className="font-medium text-green-400 text-sm">
              All nodes have images!
            </p>
          )}
        </div>
      )}
    </ScriptPage>
  );
};

export default CompassDebug;
