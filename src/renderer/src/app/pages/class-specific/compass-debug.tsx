import { useMemo, useState } from "react";
import {
  Alert,
  Block,
  Field,
  PageHead,
  RunBtn,
  TermSelect,
  TermTextarea,
} from "@/components/terminal";
import {
  COMPASS_MINOR_NODE_DEFS,
  COMPASS_NODE_DEFS,
} from "@/shared/compass-config";
import { parseCompassData } from "./compass-parser";

const nodeOptions = [
  { value: "", label: "select a node…" },
  ...COMPASS_NODE_DEFS.map((n) => ({ value: n.id, label: n.label })),
];

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
    <>
      <PageHead path="class-specific / compass-debug" title="compass-debug" />
      <Alert tone="warn">dev-only. results land in logs.</Alert>

      <Block
        note="pick a node and run 'discover' to probe its neighbors, or 'minor-debug' to inspect minor nodes around it."
        tag="script"
        title="compass.node-tools"
      >
        <Field label="node-to-center">
          <TermSelect
            onChange={setSelectedNode}
            options={nodeOptions}
            value={selectedNode}
          />
        </Field>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <RunBtn
            disabled={!selectedNode}
            getArgs={() => [selectedNode]}
            label="discover neighbors"
            scriptId="classSpecific.compass.discover"
            small
          />
          <RunBtn
            label="discover all"
            scriptId="classSpecific.compass.discoverAll"
            small
          />
          <RunBtn
            disabled={!selectedNode}
            getArgs={() => [selectedNode]}
            label="debug minor nodes"
            scriptId="classSpecific.compass.minorDebug"
            small
          />
          <RunBtn
            label="calibrate center"
            scriptId="classSpecific.compass.calibrate"
            small
          />
        </div>
      </Block>

      <Block
        note="paste compass data to audit which nodes have images configured and which are missing."
        tag="audit"
        title="compass.image-audit"
      >
        <Field label="compass-data">
          <TermTextarea
            className="h-[120px]"
            onChange={setRawData}
            placeholder="paste compass data here..."
            value={rawData}
          />
        </Field>
        {auditResult && (
          <div className="mt-2.5 space-y-2">
            {auditResult.missing.length > 0 && (
              <div>
                <div className="mb-1 font-mono text-[10px] text-destructive">
                  missing ({auditResult.missing.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {auditResult.missing.map((name) => (
                    <span
                      className="rounded-sm border border-destructive/40 bg-destructive/[0.08] px-1.5 py-px font-mono text-[10px] text-destructive"
                      key={name}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {auditResult.found.length > 0 && (
              <div>
                <div className="mb-1 font-mono text-[10px] text-success">
                  found ({auditResult.found.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {auditResult.found.map((name) => (
                    <span
                      className="rounded-sm border border-success/40 bg-success/[0.08] px-1.5 py-px font-mono text-[10px] text-success"
                      key={name}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {auditResult.missing.length === 0 && (
              <div className="font-mono text-[10px] text-success">
                ✓ all nodes have images
              </div>
            )}
          </div>
        )}
      </Block>
    </>
  );
};

export default CompassDebug;
