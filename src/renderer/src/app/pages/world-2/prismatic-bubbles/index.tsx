import { useMemo } from "react";
import { useGameData } from "@/providers/game-data-provider";
import type { AlchemyData, BubbleRef } from "@/types/alchemy";
import { BUBBLE_CATALOG, getBubbleByFlatIndex } from "./bubble-catalog";
import { BubbleRow, type RowStatus } from "./bubble-row";
import { HeaderTiles } from "./header-tiles";
import { PRISMATIC_ORDER } from "./prismatic-order";

type ResolvedRow = {
  order: number;
  fallbackName: string;
  ref: BubbleRef | null;
  level: number | null;
  status: RowStatus;
};

export default function PrismaticBubblesPage() {
  const { alchemy } = useGameData();

  const { rows, outsideOrder } = useMemo(
    () => resolveRows(PRISMATIC_ORDER, alchemy),
    [alchemy]
  );

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="font-semibold text-xl text-zinc-100">
          Prismatic Bubbles
        </h1>
        <p className="text-sm text-zinc-500">
          Curated order to spend prisma fragments. Status is read from your
          parsed save.
        </p>
      </header>

      {alchemy ? (
        <HeaderTiles alchemy={alchemy} />
      ) : (
        <div className="rounded border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-amber-200 text-sm">
          Paste your save in the Raw JSON tab to see live status.
        </div>
      )}

      {PRISMATIC_ORDER.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-sm text-zinc-400">
          PRISMATIC_ORDER is empty. Fill it in at
          <code className="mx-1 rounded bg-zinc-800 px-1 py-0.5 text-xs text-zinc-200">
            prismatic-order.ts
          </code>
          to see your curated upgrade plan.
        </div>
      ) : (
        <ol className="space-y-1">
          {rows.map((row) => (
            <BubbleRow
              fallbackName={row.fallbackName}
              key={`${row.order}-${row.fallbackName}`}
              level={row.level}
              order={row.order}
              ref={row.ref}
              status={row.status}
            />
          ))}
        </ol>
      )}

      {outsideOrder.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-sm text-zinc-300">
            Prismatic outside curated order
          </h2>
          <p className="text-xs text-zinc-500">
            Bubbles that are already prismatic but not in your curated list.
          </p>
          <ol className="space-y-1">
            {outsideOrder.map((row, idx) => (
              <BubbleRow
                fallbackName={row.fallbackName}
                key={`outside-${row.fallbackName}`}
                level={row.level}
                order={idx + 1}
                ref={row.ref}
                status="done"
              />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function resolveRows(
  order: readonly string[],
  alchemy: AlchemyData | null
): { rows: ResolvedRow[]; outsideOrder: ResolvedRow[] } {
  const resolved: ResolvedRow[] = order.map((name, idx) => {
    const ref = BUBBLE_CATALOG[name] ?? null;
    const level =
      ref && alchemy
        ? (alchemy.bubbleLevels[indexOfCauldron(ref.cauldron)]?.[
            ref.indexInCauldron
          ] ?? 0)
        : null;
    const status = computeStatus(ref, level, alchemy);
    return {
      order: idx + 1,
      fallbackName: name,
      ref,
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
        .map((r) => r.ref?.flatIndex)
        .filter((v): v is number => typeof v === "number")
    );
    for (const flatIndex of alchemy.prismaticBubbleFlatIndices) {
      if (curatedFlatIndices.has(flatIndex)) {
        continue;
      }
      const ref = getBubbleByFlatIndex(flatIndex);
      outsideOrder.push({
        order: 0,
        fallbackName: ref?.name ?? `Unknown #${flatIndex}`,
        ref,
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
  // Mirrors CAULDRON_ORDER from @/types/alchemy.
  switch (c) {
    case "power":
      return 0;
    case "quicc":
      return 1;
    case "highIq":
      return 2;
    case "kazam":
      return 3;
    default:
      throw new Error(`Unknown cauldron: ${c}`);
  }
}
