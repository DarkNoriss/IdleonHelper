import type { PrismaMultiplier } from "@/types/alchemy";

const ROW_LABEL: Record<keyof PrismaMultiplier["breakdown"], string> = {
  tesseract: "Tesseract",
  arcade: "Arcade",
  sushi: "Sushi",
  trophy: "Trophy",
  palette: "Palette",
  etherealSigils: "Ethereal Sigils",
  exoticMarket: "Exotic Market",
  legendTalent: "Legend Talent",
  companion: "Companion",
};

type Props = {
  multiplier: PrismaMultiplier;
};

export function MultiplierTooltip({ multiplier }: Props) {
  const missing = new Set(multiplier.missing);
  const rows = Object.entries(multiplier.breakdown) as [
    keyof PrismaMultiplier["breakdown"],
    number,
  ][];
  return (
    <div className="space-y-1 text-xs">
      <div className="font-semibold text-zinc-100">
        Prisma multiplier breakdown
      </div>
      <ul className="space-y-0.5">
        {rows.map(([key, value]) => (
          <li
            className="flex items-center justify-between gap-4 font-mono"
            key={key}
          >
            <span className="text-zinc-400">{ROW_LABEL[key]}</span>
            <span className="text-zinc-200">
              {missing.has(key) ? "-" : `+${value.toFixed(2)}`}
            </span>
          </li>
        ))}
      </ul>
      {missing.size > 0 && (
        <div className="pt-1 text-zinc-500">
          Missing sources in save: shown as -. Effective value uses what is
          present.
        </div>
      )}
    </div>
  );
}
