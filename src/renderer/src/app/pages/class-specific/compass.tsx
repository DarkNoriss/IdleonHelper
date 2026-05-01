import { Tabs } from "@base-ui/react/tabs";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Block,
  Field,
  PageHead,
  RunBtn,
  TermTabs,
  TermTextarea,
} from "@/components/terminal";
import { useMainState } from "@/hooks/use-main-state.ts";
import {
  COMPASS_MINOR_NODE_DEFS,
  COMPASS_NODE_DEFS,
} from "@/shared/compass-config";
import { CompassOptimizerTab } from "./compass-optimizer-tab";
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
    <TermTabs
      defaultValue="scripts"
      tabs={[
        { value: "scripts", label: "scripts" },
        { value: "optimizer", label: "optimizer" },
      ]}
    >
      <Tabs.Panel value="scripts">
        <PageHead
          description="Drives the Divinity Compass automatically based on an upgrade plan you paste in."
          path="class-specific / compass"
          title="compass"
        />
        <Block
          note="paste the upgrade list from your planner. format: one node-name per line. script walks the path and picks each upgrade in order."
          tag="script"
          title="compass.run"
        >
          <Field label="compass-data">
            <TermTextarea
              className="h-[140px]"
              onChange={setRawData}
              placeholder="paste compass data here..."
              value={rawData}
            />
          </Field>
          {hasMissing && (
            <div className="mt-2.5">
              <Alert tone="danger">
                <div className="mb-1 font-semibold">
                  missing nodes ({validation.missing.length}) — add these before
                  running:
                </div>
                <div className="flex flex-wrap gap-1">
                  {validation.missing.map((name) => (
                    <span
                      className="rounded-sm border border-destructive/40 bg-destructive/[0.08] px-1.5 py-px"
                      key={name}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </Alert>
            </div>
          )}
          <div className="mt-2.5">
            <RunBtn
              disabled={!validation || hasMissing}
              getArgs={() => [validation?.parsed ?? []]}
              label="start compass"
              scriptId="classSpecific.compass.run"
            />
          </div>
        </Block>
      </Tabs.Panel>
      <Tabs.Panel value="optimizer">
        <CompassOptimizerTab />
      </Tabs.Panel>
    </TermTabs>
  );
};

export default Compass;
