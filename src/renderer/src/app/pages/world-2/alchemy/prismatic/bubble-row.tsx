import type { BubbleRef, Cauldron } from "@/types/alchemy";

export type RowStatus =
  | "done"
  | "next"
  | "locked"
  | "queued"
  | "unknown"
  | "ambiguous";

type Props = {
  order: number;
  /** null when the name was not found in the catalog. */
  bubbleRef: BubbleRef | null;
  /** The raw name as authored — shown when bubbleRef is null. */
  fallbackName: string;
  level: number | null;
  status: RowStatus;
};

const CAULDRON_LABEL: Record<Cauldron, string> = {
  power: "power",
  quicc: "quicc",
  highIq: "high-iq",
  kazam: "kazam",
};

const CAULDRON_CLASS: Record<Cauldron, string> = {
  power: "text-red-300",
  quicc: "text-emerald-300",
  highIq: "text-sky-300",
  kazam: "text-purple-300",
};

const STATUS_LABEL: Record<RowStatus, string> = {
  done: "done",
  next: "next",
  locked: "needs-unlock",
  queued: "queued",
  unknown: "unknown-name",
  ambiguous: "ambiguous",
};

const STATUS_CLASS: Record<RowStatus, string> = {
  done: "text-emerald-300",
  next: "text-amber",
  locked: "text-rose-300",
  queued: "text-text-dim",
  unknown: "text-amber",
  ambiguous: "text-amber",
};

export const BubbleRow = ({
  order,
  bubbleRef,
  fallbackName,
  level,
  status,
}: Props) => {
  const name = bubbleRef?.name ?? fallbackName;
  const cauldron = bubbleRef?.cauldron;
  const isNext = status === "next";

  return (
    <tr className="border-border-soft border-t text-foreground transition-colors hover:bg-surface">
      <td className="px-3 py-1">
        {isNext ? (
          <span className="rounded-sm bg-primary-dim/20 px-1.5 font-medium text-primary">
            {order}
          </span>
        ) : (
          <span className="text-text-dim">{order}</span>
        )}
      </td>
      <td className="px-3 py-1">{name}</td>
      <td className="px-3 py-1">
        {cauldron ? (
          <span className={CAULDRON_CLASS[cauldron]}>
            {CAULDRON_LABEL[cauldron]}
          </span>
        ) : (
          <span className="text-text-dim">—</span>
        )}
      </td>
      <td className="px-3 py-1 text-right">
        {level === null ? (
          <span className="text-text-dim">—</span>
        ) : (
          <span className="text-text-dim">{level}</span>
        )}
      </td>
      <td className={`px-3 py-1 ${STATUS_CLASS[status]}`}>
        {STATUS_LABEL[status]}
      </td>
    </tr>
  );
};
