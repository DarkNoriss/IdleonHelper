// Toolbox utility - log10 with floor at 0 for inputs <= 1.
// Hoisted from compass-formulas.ts + tesseract-formulas.ts (third-copy threshold).
export function lavaLog(value: number): number {
  if (value <= 1) {
    return 0;
  }
  return Math.log10(value);
}
