import type { BubbleRef, Cauldron } from "@/types/alchemy";

export type RowStatus = "done" | "next" | "locked" | "queued" | "unknown";

type Props = {
  order: number;
  /** null when the name was not found in the catalog. */
  ref: BubbleRef | null;
  /** The raw name as authored — shown when ref is null. */
  fallbackName: string;
  level: number | null;
  status: RowStatus;
};

const CAULDRON_LABEL: Record<Cauldron, string> = {
  power: "Power",
  quicc: "Quicc",
  highIq: "High-IQ",
  kazam: "Kazam",
};

const CAULDRON_CLASS: Record<Cauldron, string> = {
  power: "bg-red-900/30 text-red-300 ring-red-500/40",
  quicc: "bg-emerald-900/30 text-emerald-300 ring-emerald-500/40",
  highIq: "bg-sky-900/30 text-sky-300 ring-sky-500/40",
  kazam: "bg-purple-900/30 text-purple-300 ring-purple-500/40",
};

const STATUS_LABEL: Record<RowStatus, string> = {
  done: "Done",
  next: "Next",
  locked: "Need to unlock",
  queued: "Queued",
  unknown: "Unknown bubble",
};

const STATUS_CLASS: Record<RowStatus, string> = {
  done: "bg-emerald-900/40 text-emerald-300 ring-emerald-500/50",
  next: "bg-amber-900/40 text-amber-200 ring-amber-400/60",
  locked: "bg-rose-900/40 text-rose-300 ring-rose-500/50",
  queued: "bg-zinc-800/60 text-zinc-300 ring-zinc-600/40",
  unknown: "bg-amber-900/40 text-amber-200 ring-amber-400/60",
};

export function BubbleRow({ order, ref, fallbackName, level, status }: Props) {
  const name = ref?.name ?? fallbackName;
  const cauldron = ref?.cauldron;

  return (
    <li className="flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2">
      <span className="w-8 text-right font-mono text-sm text-zinc-500">
        {order}.
      </span>
      <span className="flex-1 truncate text-sm text-zinc-100">{name}</span>
      {cauldron && (
        <span
          className={`rounded px-2 py-0.5 text-xs ring-1 ring-inset ${CAULDRON_CLASS[cauldron]}`}
        >
          {CAULDRON_LABEL[cauldron]}
        </span>
      )}
      {level !== null && (
        <span className="font-mono text-xs text-zinc-500">Lv {level}</span>
      )}
      <span
        className={`rounded px-2 py-0.5 text-xs ring-1 ring-inset ${STATUS_CLASS[status]}`}
      >
        {STATUS_LABEL[status]}
      </span>
    </li>
  );
}
