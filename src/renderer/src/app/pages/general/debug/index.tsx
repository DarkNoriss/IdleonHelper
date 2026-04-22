import { useState } from "react";
import { ScriptPage } from "@/components/script-page.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

const attackSkillOptions = [
  { value: "ui/attacks/attack_compass", label: "Compass" },
  { value: "ui/attacks/attack_eagle_eye", label: "Eagle Eye" },
] as const;

const DEFAULT_HSV_LOWER = { h: 0, s: 0, v: 128 };
const DEFAULT_HSV_UPPER = { h: 192, s: 255, v: 255 };

const Debug = () => {
  const [selectedSkill, setSelectedSkill] = useState<string>(
    attackSkillOptions[0].value
  );
  const [hsvLower, setHsvLower] = useState(DEFAULT_HSV_LOWER);
  const [hsvUpper, setHsvUpper] = useState(DEFAULT_HSV_UPPER);

  return (
    <ScriptPage
      actions={[
        {
          label: "Find Attack Skill",
          scriptId: "general.debug.findAttackSkill",
          runningLabel: "Searching... (Click to stop)",
          args: () => [selectedSkill],
        },
        {
          label: "Compass Nav Stress Test",
          scriptId: "classSpecific.compass.stressTestNav",
          runningLabel: "Stress testing... (Click to stop)",
        },
        {
          label: "Capture HSV Screen",
          scriptId: "general.debug.captureHsvScreen",
          runningLabel: "Capturing...",
          args: () => [hsvLower, hsvUpper],
        },
      ]}
      title="Debug"
    >
      <div className="mb-4">
        <label
          className="mb-1.5 block font-medium text-sm"
          htmlFor="skill-select"
        >
          Attack Skill
        </label>
        <Select
          onValueChange={(v) => v !== null && setSelectedSkill(v)}
          value={selectedSkill}
        >
          <SelectTrigger className="w-[240px]" id="skill-select">
            <SelectValue>
              {(v) => attackSkillOptions.find((o) => o.value === v)?.label ?? v}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {attackSkillOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4 space-y-3">
        <div>
          <div className="mb-1.5 block font-medium text-sm">HSV Lower</div>
          <div className="flex gap-2">
            <Input
              aria-label="HSV lower H"
              className="w-24"
              max={180}
              min={0}
              onChange={(e) =>
                setHsvLower((p) => ({ ...p, h: Number(e.target.value) }))
              }
              type="number"
              value={hsvLower.h}
            />
            <Input
              aria-label="HSV lower S"
              className="w-24"
              max={255}
              min={0}
              onChange={(e) =>
                setHsvLower((p) => ({ ...p, s: Number(e.target.value) }))
              }
              type="number"
              value={hsvLower.s}
            />
            <Input
              aria-label="HSV lower V"
              className="w-24"
              max={255}
              min={0}
              onChange={(e) =>
                setHsvLower((p) => ({ ...p, v: Number(e.target.value) }))
              }
              type="number"
              value={hsvLower.v}
            />
          </div>
        </div>
        <div>
          <div className="mb-1.5 block font-medium text-sm">HSV Upper</div>
          <div className="flex gap-2">
            <Input
              aria-label="HSV upper H"
              className="w-24"
              max={180}
              min={0}
              onChange={(e) =>
                setHsvUpper((p) => ({ ...p, h: Number(e.target.value) }))
              }
              type="number"
              value={hsvUpper.h}
            />
            <Input
              aria-label="HSV upper S"
              className="w-24"
              max={255}
              min={0}
              onChange={(e) =>
                setHsvUpper((p) => ({ ...p, s: Number(e.target.value) }))
              }
              type="number"
              value={hsvUpper.s}
            />
            <Input
              aria-label="HSV upper V"
              className="w-24"
              max={255}
              min={0}
              onChange={(e) =>
                setHsvUpper((p) => ({ ...p, v: Number(e.target.value) }))
              }
              type="number"
              value={hsvUpper.v}
            />
          </div>
        </div>
      </div>
    </ScriptPage>
  );
};

export default Debug;
