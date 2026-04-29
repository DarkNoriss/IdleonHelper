// scripts/optimizer-parity.ts
//
// Usage: pnpm tsx scripts/optimizer-parity.ts <save-fixture.json> <out-dir>
//
// Loads a saved game JSON fixture and runs computeSushiPath() across every
// (category x maxSteps x groupMode x onlyAffordable) combo, dumping the
// pre-grouping OptimizerStep[] AND the post-grouping OptimizerRow[] as JSON
// files under <out-dir>. Diff the output of two runs (main vs refactor) to
// validate parity.
//
// All numbers are serialized with a replacer that preserves Infinity / NaN
// as string sentinels so JSON.stringify doesn't drop them.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { groupSteps } from "../src/parsers/optimizer-core";
import { parseSushiStation } from "../src/parsers/sushi-station";
import { computeSushiPath } from "../src/parsers/sushi-station-optimizer";

const CATEGORIES = ["all", "bucks", "fuelRate", "fuelCap"] as const;
const MAX_STEPS = [10, 25, 50, 100, 300] as const;
const GROUP_MODES = ["none", "upgrade", "summary"] as const;
const AFFORDABLE = [false, true] as const;

const [, , fixturePath, outDir] = process.argv;
if (!(fixturePath && outDir)) {
  console.error("Usage: tsx scripts/optimizer-parity.ts <fixture> <outDir>");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(fixturePath, "utf8"));
const data = parseSushiStation(raw);
if (!data) {
  console.error("parseSushiStation returned null - bad fixture?");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const replacer = (_k: string, v: unknown): unknown => {
  if (typeof v === "number") {
    if (v === Number.POSITIVE_INFINITY) {
      return "__INF__";
    }
    if (v === Number.NEGATIVE_INFINITY) {
      return "__NEG_INF__";
    }
    if (Number.isNaN(v)) {
      return "__NAN__";
    }
  }
  return v;
};

let total = 0;
for (const category of CATEGORIES) {
  for (const maxSteps of MAX_STEPS) {
    for (const groupMode of GROUP_MODES) {
      for (const onlyAffordable of AFFORDABLE) {
        const steps = computeSushiPath({
          data,
          category,
          maxSteps,
          onlyAffordable,
        });
        const rows = groupSteps(steps, groupMode, category !== "all");
        const filename = `${category}-${maxSteps}-${groupMode}-${onlyAffordable}.json`;
        writeFileSync(
          join(outDir, filename),
          JSON.stringify({ steps, rows }, replacer, 2)
        );
        total++;
      }
    }
  }
}

console.log(`wrote ${total} parity files to ${outDir}`);
