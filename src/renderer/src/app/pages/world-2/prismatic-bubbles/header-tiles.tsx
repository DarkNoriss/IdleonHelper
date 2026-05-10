import type { ReactNode } from "react";
import type { AlchemyData } from "@/types/alchemy";
import { TOTAL_BUBBLE_COUNT } from "./bubble-catalog";
import { MultiplierTooltip } from "./multiplier-tooltip";

type Props = {
  alchemy: AlchemyData;
};

export function HeaderTiles({ alchemy }: Props) {
  const prismaticCount = alchemy.prismaticBubbleFlatIndices.size;
  const hasMissing = alchemy.prismaMultiplier.missing.length > 0;
  const multiplierLabel = `${
    hasMissing ? "≥ " : ""
  }${alchemy.prismaMultiplier.value.toFixed(2)}x`;

  return (
    <div className="grid grid-cols-3 gap-3">
      <Tile
        label="Prisma Fragments"
        value={alchemy.prismaFragments.toLocaleString()}
      />
      <Tile
        label="Prismatic Bubbles"
        value={`${prismaticCount} / ${TOTAL_BUBBLE_COUNT}`}
      />
      <Tile
        extra={<MultiplierTooltip multiplier={alchemy.prismaMultiplier} />}
        label="Prisma Multiplier"
        value={multiplierLabel}
      />
    </div>
  );
}

type TileProps = {
  label: string;
  value: string;
  extra?: ReactNode;
};

function Tile({ label, value, extra }: TileProps) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/60 px-4 py-3">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-1 font-semibold text-lg text-zinc-100">{value}</div>
      {extra && <div className="mt-2">{extra}</div>}
    </div>
  );
}
