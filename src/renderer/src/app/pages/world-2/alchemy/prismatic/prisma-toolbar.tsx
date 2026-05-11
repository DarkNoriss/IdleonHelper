import type { AlchemyData, PrismaMultiplier } from "@/types/alchemy";

const BREAKDOWN_LABEL: Record<keyof PrismaMultiplier["breakdown"], string> = {
  tesseract: "tesseract",
  arcade: "arcade",
  sushi: "sushi",
  trophy: "trophy",
  palette: "palette",
  etherealSigils: "sigils",
  exoticMarket: "exotic-mkt",
  legendTalent: "legend-tal",
  companion: "companion",
};

type Props = {
  alchemy: AlchemyData | null;
};

export const PrismaToolbar = ({ alchemy }: Props) => {
  if (!alchemy) {
    return (
      <div className="mb-2.5 rounded-[5px] border border-border bg-panel p-2.5 font-mono text-[11px] text-text-dim">
        --prisma · paste save in raw-data tab to see live status
      </div>
    );
  }

  const { prismaFragments, prismaMultiplier } = alchemy;
  const hasMissing = prismaMultiplier.missing.length > 0;
  const multiplierLabel = `${hasMissing ? "≥" : ""}${prismaMultiplier.value.toFixed(2)}x`;
  const missingSet = new Set(prismaMultiplier.missing);
  const entries = Object.entries(prismaMultiplier.breakdown) as [
    keyof PrismaMultiplier["breakdown"],
    number,
  ][];

  return (
    <div className="mb-2.5 rounded-[5px] border border-border bg-panel p-2.5 font-mono text-[11px]">
      <div className="mb-2 text-text-dim">--prisma</div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <Stat label="fragments" value={prismaFragments.toLocaleString()} />
        <Stat label="multiplier" value={multiplierLabel} />
      </div>
      <div className="border-border-soft border-t pt-1.5">
        <div className="mb-1 text-[9.5px] text-text-muted uppercase tracking-[0.6px]">
          breakdown
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px]">
          {entries.map(([key, value]) => {
            const missing = missingSet.has(key);
            return (
              <span className="flex items-baseline gap-1" key={key}>
                <span className="text-text-dim">{BREAKDOWN_LABEL[key]}</span>
                <span
                  className={missing ? "text-text-muted" : "text-foreground"}
                >
                  {missing ? "—" : `+${value.toFixed(2)}`}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline gap-1.5">
    <span className="text-text-dim">{label}:</span>
    <span className="text-[13px] text-foreground">{value}</span>
  </div>
);
