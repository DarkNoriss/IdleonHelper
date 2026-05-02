import { useEffect } from "react";
import {
  Block,
  Field,
  PageHead,
  RunBtn,
  TermSelect,
} from "@/components/terminal";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";

const candyOptions = [
  { value: "1h", label: "1H" },
  { value: "2h", label: "2H" },
  { value: "4h", label: "4H" },
  { value: "12h", label: "12H" },
  { value: "24h", label: "24H" },
];

const DEFAULT_DURATION = "1h";

const Candy = () => {
  const duration = useUiPrefsStore((s) => s.candy.duration);
  const setCandy = useUiPrefsStore((s) => s.setCandy);

  useEffect(() => {
    if (!candyOptions.some((o) => o.value === duration)) {
      setCandy({ duration: DEFAULT_DURATION });
    }
  }, [duration, setCandy]);

  return (
    <>
      <PageHead path="general / candy" title="candy" />
      <Block
        note="switch in-game to the target character before starting. script auto-stops when no matching candies are left."
        tag="script"
        title="candy.run"
      >
        <div className="flex items-end gap-2.5">
          <Field label="duration" width="w-[140px]">
            <TermSelect
              onChange={(v) => setCandy({ duration: v })}
              options={candyOptions}
              value={duration}
            />
          </Field>
          <RunBtn
            getArgs={() => [duration]}
            label="start candy"
            scriptId="general.candy.run"
          />
        </div>
      </Block>
    </>
  );
};

export default Candy;
