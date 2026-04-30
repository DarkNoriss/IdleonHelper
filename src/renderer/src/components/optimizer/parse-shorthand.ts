const SUFFIX_MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  m: 1e6,
  b: 1e9,
  t: 1e12,
  q: 1e15,
};

const SHORTHAND_PATTERN = /^([0-9]*\.?[0-9]+)([kmbtq]?)$/;

// Accepts:
//   - shorthand: "1.5k", "754t", "12q", ".5b"
//   - comma-formatted: "754,000,000,000,000"
//   - whitespace inside the number: "754 000 000"
//   - mixed case
//   - empty string -> 0
// Returns NaN for unparseable input.
export function parseShorthandNumber(input: string): number {
  const cleaned = input.trim().toLowerCase().replace(/[\s,]/g, "");
  if (cleaned === "") {
    return 0;
  }
  const match = cleaned.match(SHORTHAND_PATTERN);
  if (!match) {
    return Number.NaN;
  }
  const base = Number.parseFloat(match[1] ?? "0");
  const suffix = match[2];
  const mul =
    suffix && SUFFIX_MULTIPLIERS[suffix] ? SUFFIX_MULTIPLIERS[suffix] : 1;
  return base * mul;
}

// Format a number with thousands separators ("754000000000000" -> "754,000,000,000,000").
// Uses en-US locale for stable comma separator regardless of the user's system locale.
export function formatShorthandNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
