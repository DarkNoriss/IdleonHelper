import { TermCheckbox } from "@/components/terminal";
import type { AlchemyData } from "@/types/alchemy";

type Props = {
  alchemy: AlchemyData | null;
  doneCount: number;
  totalCount: number;
  showDone: boolean;
  onShowDoneChange: (next: boolean) => void;
};

export const PrismaToolbar = ({
  alchemy,
  doneCount,
  totalCount,
  showDone,
  onShowDoneChange,
}: Props) => {
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
  const progressLabel = totalCount > 0 ? `${doneCount}/${totalCount}` : "—";

  return (
    <div className="mb-2.5 rounded-[5px] border border-border bg-panel p-2.5 font-mono text-[11px]">
      <div className="mb-2 text-text-dim">--prisma</div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <Stat
          label="fragments"
          value={Math.floor(prismaFragments).toLocaleString()}
        />
        <Stat label="multiplier" value={multiplierLabel} />
        <Stat label="progress" value={progressLabel} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <TermCheckbox
          checked={showDone}
          label="show done"
          onChange={onShowDoneChange}
        />
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
