import { useEffect, useMemo, useState } from "react";
import {
  Block,
  Field,
  PageHead,
  RunBtn,
  TermSelect,
} from "@/components/terminal";
import { useMainState } from "@/hooks/use-main-state.ts";
import { critters, trapConfigs } from "@/parsers/trapping";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";

const formatCountdown = (ms: number): string => {
  if (ms <= 0) {
    return "0s";
  }
  const totalSeconds = Math.ceil(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const critterOptions = [{ value: "", label: "select critter…" }, ...critters];
const trapOptions = [
  { value: "", label: "select trap…" },
  ...trapConfigs.map((t) => ({ value: t.value, label: t.label })),
];

const timerOptionsFor = (trap: string): { value: string; label: string }[] => {
  const selected = trapConfigs.find((t) => t.value === trap);
  if (!selected) {
    return [{ value: "", label: "—" }];
  }
  return [
    { value: "", label: "—" },
    ...selected.timers.map((t) => ({ value: t, label: t })),
  ];
};

const sanitizeTrapTimer = (trap: string, timer: string) => {
  if (trap === "") {
    return { trap: "", timer: "" };
  }
  const selected = trapConfigs.find((t) => t.value === trap);
  if (!selected) {
    return { trap: "", timer: "" };
  }
  if (timer !== "" && !selected.timers.includes(timer)) {
    return { trap, timer: "" };
  }
  return { trap, timer };
};

const PlaceBlock = () => {
  const critter = useUiPrefsStore((s) => s.trapping.place.critter);
  const trap = useUiPrefsStore((s) => s.trapping.place.trap);
  const timer = useUiPrefsStore((s) => s.trapping.place.timer);
  const setTrappingPlace = useUiPrefsStore((s) => s.setTrappingPlace);
  const placeTraps = useMainState("placeTraps");
  const timerOptions = useMemo(() => timerOptionsFor(trap), [trap]);

  useEffect(() => {
    if (critter !== "" && !critters.some((c) => c.value === critter)) {
      setTrappingPlace({ critter: "" });
    }
  }, [critter, setTrappingPlace]);

  useEffect(() => {
    const sanitized = sanitizeTrapTimer(trap, timer);
    if (sanitized.trap !== trap || sanitized.timer !== timer) {
      setTrappingPlace(sanitized);
    }
  }, [trap, timer, setTrappingPlace]);

  return (
    <Block
      note="open the trapping menu in-game on any character. pick critter + trap tier + duration."
      tag="script"
      title="traps.place"
    >
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
        <Field label="critter">
          <TermSelect
            onChange={(v) => setTrappingPlace({ critter: v })}
            options={critterOptions}
            value={critter}
          />
        </Field>
        <Field label="trap-type">
          <TermSelect
            onChange={(v) => setTrappingPlace({ trap: v, timer: "" })}
            options={trapOptions}
            value={trap}
          />
        </Field>
        <Field label="timer">
          <TermSelect
            disabled={!trap}
            onChange={(v) => setTrappingPlace({ timer: v })}
            options={timerOptions}
            value={timer}
          />
        </Field>
        <RunBtn
          disabled={!(critter && trap && timer)}
          getArgs={() => [critter, trap, timer]}
          label="place"
          scriptId="world3.trapping.placeTraps"
          small
        />
      </div>
      {placeTraps?.current && (
        <div className="mt-2 font-mono text-[10px] text-text-dim">
          placing for character{" "}
          <span className="text-foreground">{placeTraps.current}</span>…
        </div>
      )}
    </Block>
  );
};

const CollectBlock = () => {
  const trap = useUiPrefsStore((s) => s.trapping.collect.trap);
  const timer = useUiPrefsStore((s) => s.trapping.collect.timer);
  const setTrappingCollect = useUiPrefsStore((s) => s.setTrappingCollect);
  const [remaining, setRemaining] = useState<string | null>(null);
  const collectTraps = useMainState("collectTraps");
  const queue = useMainState("queue");
  const hasCollectTrapsItem =
    queue?.queue.some((i) => i.scriptId === "world3.trapping.collectTraps") ??
    false;
  const timerOptions = useMemo(() => timerOptionsFor(trap), [trap]);

  useEffect(() => {
    const sanitized = sanitizeTrapTimer(trap, timer);
    if (sanitized.trap !== trap || sanitized.timer !== timer) {
      setTrappingCollect(sanitized);
    }
  }, [trap, timer, setTrappingCollect]);

  useEffect(() => {
    const endsAt = collectTraps?.endsAt;
    if (!(endsAt && hasCollectTrapsItem)) {
      setRemaining(null);
      return;
    }
    const update = () => {
      const diff = endsAt - Date.now();
      if (diff <= 0) {
        setRemaining(null);
      } else {
        setRemaining(formatCountdown(diff));
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [collectTraps?.endsAt, hasCollectTrapsItem]);

  return (
    <Block
      note="collects traps of chosen tier. leave timer empty to skip re-arming."
      tag="script"
      title="traps.collect"
    >
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <Field label="trap-type">
          <TermSelect
            onChange={(v) => setTrappingCollect({ trap: v, timer: "" })}
            options={trapOptions}
            value={trap}
          />
        </Field>
        <Field label="timer (optional)">
          <TermSelect
            disabled={!trap}
            onChange={(v) => setTrappingCollect({ timer: v })}
            options={timerOptions}
            value={timer}
          />
        </Field>
        <RunBtn
          disabled={!trap}
          getArgs={() => [timer]}
          label="collect"
          scriptId="world3.trapping.collectTraps"
          small
        />
      </div>
      {remaining && (
        <div className="mt-2 font-mono text-[10px] text-text-dim">
          next collection in{" "}
          <span className="text-foreground">{remaining}</span>
        </div>
      )}
    </Block>
  );
};

const Trapping = () => (
  <>
    <PageHead path="world-3 / trapping" title="trapping" />
    <PlaceBlock />
    <CollectBlock />
  </>
);

export default Trapping;
