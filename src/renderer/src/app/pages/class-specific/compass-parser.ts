import type { CompassUpgrade } from "@/types/compass";

const LEVELS_PATTERN = /Levels\s+(\d+)\s*→\s*(\d+)/;

export const parseCompassData = (raw: string): CompassUpgrade[] => {
  const lines = raw.split("\n");
  const upgrades: CompassUpgrade[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!(trimmed && /^\d/.test(trimmed))) {
      continue;
    }

    const parts = trimmed
      .split(/\t|\s{4,}/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length < 4) {
      continue;
    }

    const name = parts[1]!
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");
    const statChanges = parts[3]!;

    const match = statChanges.match(LEVELS_PATTERN);
    const change = match ? Number(match[2]) - Number(match[1]) + 1 : 1;

    upgrades.push({ name, change });
  }

  return upgrades;
};
