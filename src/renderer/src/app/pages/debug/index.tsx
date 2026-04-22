import { useState } from "react";
import {
  Alert,
  Block,
  Field,
  HsvRow,
  PageHead,
  RunBtn,
  TermSelect,
} from "@/components/terminal";

const attackSkillOptions = [
  { value: "ui/attacks/attack_compass", label: "Compass" },
  { value: "ui/attacks/attack_eagle_eye", label: "Eagle Eye" },
] as const;

const DEFAULT_SKILL = attackSkillOptions[0].value;
const DEFAULT_HSV_LOWER = { h: 0, s: 0, v: 128 };
const DEFAULT_HSV_UPPER = { h: 192, s: 255, v: 255 };

const Debug = () => {
  const [skill, setSkill] = useState<string>(DEFAULT_SKILL);
  const [hsvLower, setHsvLower] = useState(DEFAULT_HSV_LOWER);
  const [hsvUpper, setHsvUpper] = useState(DEFAULT_HSV_UPPER);

  const resetHsv = () => {
    setHsvLower(DEFAULT_HSV_LOWER);
    setHsvUpper(DEFAULT_HSV_UPPER);
  };

  return (
    <>
      <PageHead
        description="Internal tools for probing attack-skill templates and tuning HSV color thresholds. Intended for development — not part of normal automation."
        path="debug"
        title="debug"
      />
      <Alert tone="warn">
        dev-only page. scripts here run loose probes against the game window —
        results land in <span className="text-amber">logs</span>.
      </Alert>

      <Block
        note="scans the active game window for the selected attack-skill template and prints match coordinates to the log."
        tag="script"
        title="debug.findAttackSkill"
      >
        <div className="flex items-end gap-2.5">
          <Field label="attack-skill" width="w-[220px]">
            <TermSelect
              onChange={setSkill}
              options={attackSkillOptions}
              value={skill}
            />
          </Field>
          <RunBtn
            getArgs={() => [skill]}
            label="find attack skill"
            scriptId="general.debug.findAttackSkill"
          />
        </div>
      </Block>

      <Block
        note="hammers the compass navigation routine in a tight loop to surface flaky clicks and routing regressions."
        tag="script"
        title="debug.stressNav"
      >
        <RunBtn
          label="compass nav stress test"
          scriptId="classSpecific.compass.stressTestNav"
        />
      </Block>

      <Block
        note="captures the screen and masks it to the configured HSV range. use to tune thresholds when a template match is drifting."
        tag="script"
        title="debug.captureHsv"
      >
        <div className="mb-2.5 grid grid-cols-2 gap-2.5">
          <HsvRow label="hsv-lower" onChange={setHsvLower} value={hsvLower} />
          <HsvRow label="hsv-upper" onChange={setHsvUpper} value={hsvUpper} />
        </div>
        <div className="flex items-center gap-2">
          <RunBtn
            getArgs={() => [hsvLower, hsvUpper]}
            label="capture hsv"
            scriptId="general.debug.captureHsvScreen"
          />
          <button
            className="cursor-pointer rounded-[3px] border border-border bg-surface px-2.5 py-[5px] font-mono text-[10.5px] text-text-dim hover:bg-surface-hi"
            onClick={resetHsv}
            type="button"
          >
            ↺ reset
          </button>
          <div className="ml-auto font-mono text-[10px] text-text-muted">
            h [0–180] · s [0–255] · v [0–255]
          </div>
        </div>
      </Block>
    </>
  );
};

export default Debug;
