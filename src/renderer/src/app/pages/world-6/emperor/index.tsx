import {
  Block,
  Field,
  PageHead,
  RunBtn,
  TermCheckbox,
  TermSelect,
} from "@/components/terminal";
import { useMainState } from "@/hooks/use-main-state.ts";
import { PRESET_CONFIGS } from "@/parsers/card-presets";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";

const SKIP_PRESET = "skip";

const presetOptions = [
  { value: SKIP_PRESET, label: "none - keep current" },
  ...PRESET_CONFIGS.map((p) => ({
    value: String(p.slot),
    label: `${p.name} (${p.slot})`,
  })),
];

const Emperor = () => {
  const presetSlot = useUiPrefsStore((s) => s.w6Emperor.presetSlot);
  const skipReset = useUiPrefsStore((s) => s.w6Emperor.skipReset);
  const setW6Emperor = useUiPrefsStore((s) => s.setW6Emperor);
  const state = useMainState("w6BossFarmer");
  const isRunning = state?.running ?? false;
  const phase = state?.phase ?? "idle";

  const presetValue = presetSlot === null ? SKIP_PRESET : String(presetSlot);

  const handlePresetChange = (v: string) => {
    setW6Emperor({ presetSlot: v === SKIP_PRESET ? null : Number(v) });
  };

  return (
    <>
      <PageHead path="world-6 / emperor" title="emperor" />
      <Block
        note={
          "defeat the world-6 emperor on a loop. stand on the platform next to the banner before starting. " +
          "configure your dmg and dr presets in card-presets first - the script swaps to your chosen one, " +
          "opens the banner, optionally resets, fights with auto-attack, then portals back to the banner. " +
          'uncheck "reset" to push higher boss levels (longer fights, no timeout).'
        }
        tag="script"
        title="emperor.run"
      >
        <div className="flex flex-col gap-2.5">
          <Field label="card preset" width="w-[220px]">
            <TermSelect
              disabled={isRunning}
              onChange={handlePresetChange}
              options={presetOptions}
              value={presetValue}
            />
          </Field>
          <TermCheckbox
            checked={!skipReset}
            disabled={isRunning}
            label="reset boss before each fight (uncheck to push higher levels)"
            onChange={(checked) => setW6Emperor({ skipReset: !checked })}
          />
          <div>
            <RunBtn
              getArgs={() => [presetSlot, skipReset]}
              label="start emperor farmer"
              scriptId="world6.bossFarmer.run"
            />
          </div>
        </div>
        {isRunning && (
          <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-[3px] border border-border-soft bg-panel-2 p-2.5 font-mono text-[10.5px]">
            <span className="text-text-dim">
              phase: <span className="text-foreground">{phase}</span>
            </span>
          </div>
        )}
      </Block>
    </>
  );
};

export default Emperor;
