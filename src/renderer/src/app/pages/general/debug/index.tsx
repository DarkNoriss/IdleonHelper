import { useState } from "react";
import { ScriptPage } from "@/components/script-page.tsx";
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

const Debug = () => {
  const [selectedSkill, setSelectedSkill] = useState<string>(
    attackSkillOptions[0].value
  );

  return (
    <ScriptPage
      actions={[
        {
          label: "Find Attack Skill",
          scriptId: "general.debug.findAttackSkill",
          runningLabel: "Searching... (Click to stop)",
          args: () => [selectedSkill],
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
        <Select onValueChange={setSelectedSkill} value={selectedSkill}>
          <SelectTrigger className="w-[240px]" id="skill-select">
            <SelectValue />
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
    </ScriptPage>
  );
};

export default Debug;
