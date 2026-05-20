import { describe, expect, it } from "vitest";
import { type CellTier, decideDrainCandidate } from "./sushi-station-board";
import { MAX_TEMPLATE_TIER } from "./sushi-station-constants";

// Build a board from [tier, cell] pairs. Cells are arbitrary but unique.
const board = (pairs: [number, number][]): CellTier[] =>
  pairs.map(([tierNumber, cell]) => ({
    cell,
    tier: `T${tierNumber}`,
    tierNumber,
  }));

// Helper: N pieces of one tier at consecutive cells starting at `start`.
const run = (tier: number, count: number, start: number): [number, number][] =>
  Array.from(
    { length: count },
    (_, i) => [tier, start + i] as [number, number]
  );

const decide = (
  b: CellTier[],
  peakTier: number | null,
  mergeAboveHotew = true
) =>
  decideDrainCandidate({
    board: b,
    peakTier,
    mergeAboveHotew,
    maxTemplateTier: MAX_TEMPLATE_TIER,
  });

describe("decideDrainCandidate", () => {
  it("stops on an empty board", () => {
    expect(decide([], null)).toEqual({ action: "stop", reason: "empty" });
  });

  it("first merge of a phase picks the highest tier with count>=2", () => {
    // floor = lowest+1. lowest=30 => floor=31. Above floor with count>=2: T33.
    const b = board([...run(30, 2, 0), ...run(33, 2, 10), [40, 20]]);
    expect(decide(b, null)).toEqual({
      action: "merge",
      candidateTier: 33,
      isFloorFallback: false,
    });
  });

  it("does not stop mid-climb when candidate exceeds the peak", () => {
    // peak=40, highest count>=2 candidate above floor is T41 (>40) -> merge.
    const b = board([...run(30, 2, 0), ...run(41, 2, 10)]);
    expect(decide(b, 40)).toEqual({
      action: "merge",
      candidateTier: 41,
      isFloorFallback: false,
    });
  });

  it("does not stop when candidate equals the peak (strict < boundary)", () => {
    // peak=41, highest count>=2 candidate above floor is exactly T41 -> merge.
    const b = board([...run(30, 2, 0), ...run(41, 2, 10)]);
    expect(decide(b, 41)).toEqual({
      action: "merge",
      candidateTier: 41,
      isFloorFallback: false,
    });
  });

  it("WRAP REGRESSION: stops when candidate drops below the session peak", () => {
    // The bug: climb reached T55 (peak=55), only count>=2 tier left is the
    // working floor T32. min-watermark let 32 through; peak-watermark stops.
    const b = board([
      ...run(31, 2, 0), // lowest tier present -> floor = 32
      ...run(32, 13, 10), // working area, count>=2, but below peak
      [33, 30],
      [40, 31],
      [55, 32], // consolidated staircase singles above
    ]);
    expect(decide(b, 55)).toEqual({ action: "stop", reason: "below-peak" });
  });

  it("floor fallback merges the floor when it has count>=3 and nothing above is eligible", () => {
    // lowest=30 => floor=31. Nothing above floor with count>=2. Floor T31 has 4.
    const b = board([...run(30, 2, 0), ...run(31, 4, 10)]);
    expect(decide(b, null)).toEqual({
      action: "merge",
      candidateTier: 31,
      isFloorFallback: true,
    });
  });

  it("no-candidate when nothing above floor and floor has count<3", () => {
    const b = board([...run(30, 2, 0), ...run(31, 2, 10)]);
    expect(decide(b, null)).toEqual({ action: "stop", reason: "no-candidate" });
  });

  it("excludes the MAX_TEMPLATE_TIER hard cap from candidates", () => {
    // Two MAX_TEMPLATE_TIER pieces must NOT be chosen; falls through to T33.
    const b = board([
      ...run(30, 2, 0),
      ...run(33, 2, 10),
      ...run(MAX_TEMPLATE_TIER, 2, 20),
    ]);
    expect(decide(b, null)).toEqual({
      action: "merge",
      candidateTier: 33,
      isFloorFallback: false,
    });
  });

  it("excludes tiers above buffCap when mergeAboveHotew is false", () => {
    // highest=50 => buffCap=44. T48 pair is above band -> excluded; picks T40.
    const b = board([
      ...run(30, 2, 0),
      ...run(40, 2, 10),
      ...run(48, 2, 20),
      [50, 30],
    ]);
    expect(decide(b, null, false)).toEqual({
      action: "merge",
      candidateTier: 40,
      isFloorFallback: false,
    });
  });

  it("allows tiers above buffCap when mergeAboveHotew is true", () => {
    const b = board([
      ...run(30, 2, 0),
      ...run(40, 2, 10),
      ...run(48, 2, 20),
      [50, 30],
    ]);
    expect(decide(b, null, true)).toEqual({
      action: "merge",
      candidateTier: 48,
      isFloorFallback: false,
    });
  });
});
