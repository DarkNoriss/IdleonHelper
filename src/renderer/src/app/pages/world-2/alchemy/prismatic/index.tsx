import { useMemo } from "react";
import { useGameData } from "@/providers/game-data-provider";
import {
  type AlchemyData,
  type BubbleRef,
  CAULDRON_ORDER,
} from "@/types/alchemy";
import { getBubbleByFlatIndex, resolveBubbleByName } from "./bubble-catalog";
import { BubbleRow, type RowStatus } from "./bubble-row";
import { PrismaToolbar } from "./prisma-toolbar";
import { PRISMATIC_ORDER } from "./prismatic-order";

type ResolvedRow = {
  order: number;
  fallbackName: string;
  bubbleRef: BubbleRef | null;
  level: number | null;
  status: RowStatus;
};

const HEADER_CLASS =
  "px-3 py-2 font-medium text-[9.5px] text-text-muted uppercase tracking-[0.6px]";

export const PrismaticBubblesTab = () => {
  const { alchemy } = useGameData();

  const { rows, outsideOrder } = useMemo(
    () => resolveRows(PRISMATIC_ORDER, alchemy),
    [alchemy]
  );

  return (
    <>
      <PrismaToolbar alchemy={alchemy} />

      {PRISMATIC_ORDER.length === 0 ? (
        <div className="rounded-[5px] border border-border bg-panel p-4 text-center font-mono text-[11px] text-text-dim">
          --prismatic-order is empty. fill it in at prismatic-order.ts to see
          your curated upgrade plan.
        </div>
      ) : (
        <OrderTable rows={rows} />
      )}

      {outsideOrder.length > 0 && (
        <div className="mt-2.5">
          <div className="mb-1 font-mono text-[9.5px] text-text-muted uppercase tracking-[0.6px]">
            --prismatic outside curated order
          </div>
          <OrderTable rows={outsideOrder} />
        </div>
      )}
    </>
  );
};

const OrderTable = ({ rows }: { rows: readonly ResolvedRow[] }) => (
  <div className="overflow-x-auto rounded-[5px] border border-border bg-panel">
    <table className="w-full font-mono text-[11px]">
      <thead className="bg-panel-2">
        <tr>
          <th className={`${HEADER_CLASS} text-left`}>#</th>
          <th className={`${HEADER_CLASS} text-left`}>bubble</th>
          <th className={`${HEADER_CLASS} text-left`}>cauldron</th>
          <th className={`${HEADER_CLASS} text-right`}>lvl</th>
          <th className={`${HEADER_CLASS} text-left`}>status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <BubbleRow
            bubbleRef={row.bubbleRef}
            fallbackName={row.fallbackName}
            key={`${row.order}-${row.fallbackName}`}
            level={row.level}
            order={row.order}
            status={row.status}
          />
        ))}
      </tbody>
    </table>
  </div>
);

function resolveRows(
  order: readonly string[],
  alchemy: AlchemyData | null
): { rows: ResolvedRow[]; outsideOrder: ResolvedRow[] } {
  const resolved: ResolvedRow[] = order.map((name, idx) => {
    const resolution = resolveBubbleByName(name);
    const ref = resolution.ref;
    const level =
      ref && alchemy
        ? (alchemy.bubbleLevels[indexOfCauldron(ref.cauldron)]?.[
            ref.indexInCauldron
          ] ?? 0)
        : null;
    const status = resolution.ambiguous
      ? ("ambiguous" as const)
      : computeStatus(ref, level, alchemy);
    return {
      order: idx + 1,
      fallbackName: name,
      bubbleRef: ref,
      level,
      status,
    };
  });

  // Promote first non-done, non-locked row to "next"
  for (const row of resolved) {
    if (row.status === "queued") {
      row.status = "next";
      break;
    }
  }

  const outsideOrder: ResolvedRow[] = [];
  if (alchemy) {
    const curatedFlatIndices = new Set(
      resolved
        .map((r) => r.bubbleRef?.flatIndex)
        .filter((v): v is number => typeof v === "number")
    );
    let outsideOrderIdx = 0;
    for (const flatIndex of alchemy.prismaticBubbleFlatIndices) {
      if (curatedFlatIndices.has(flatIndex)) {
        continue;
      }
      const ref = getBubbleByFlatIndex(flatIndex);
      outsideOrderIdx += 1;
      outsideOrder.push({
        order: outsideOrderIdx,
        fallbackName: ref?.name ?? `Unknown #${flatIndex}`,
        bubbleRef: ref,
        level: ref
          ? (alchemy.bubbleLevels[indexOfCauldron(ref.cauldron)]?.[
              ref.indexInCauldron
            ] ?? 0)
          : null,
        status: "done",
      });
    }
  }

  return { rows: resolved, outsideOrder };
}

function computeStatus(
  ref: BubbleRef | null,
  level: number | null,
  alchemy: AlchemyData | null
): RowStatus {
  if (!ref) {
    return "unknown";
  }
  if (!alchemy) {
    return "queued";
  }
  if (alchemy.prismaticBubbleFlatIndices.has(ref.flatIndex)) {
    return "done";
  }
  if ((level ?? 0) === 0) {
    return "locked";
  }
  return "queued";
}

function indexOfCauldron(c: BubbleRef["cauldron"]): number {
  return CAULDRON_ORDER.indexOf(c);
}
