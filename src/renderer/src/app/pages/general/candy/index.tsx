import { useEffect } from "react";
import { ScriptPage } from "@/components/script-page.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";

const candyOptions = [
  { value: "1h", label: "1H" },
  { value: "2h", label: "2H" },
  { value: "4h", label: "4H" },
  { value: "12h", label: "12H" },
  { value: "24h", label: "24H" },
] as const;

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
    <ScriptPage
      actions={[
        {
          label: "Start",
          scriptId: "general.candy.run",
          runningLabel: "Stop",
          args: () => [duration],
        },
      ]}
      title="Candy"
    >
      <div className="mb-4">
        <Select
          onValueChange={(v) => v !== null && setCandy({ duration: v })}
          value={duration}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {candyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </ScriptPage>
  );
};

export default Candy;
