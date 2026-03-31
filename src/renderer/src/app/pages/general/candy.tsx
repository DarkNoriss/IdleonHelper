import { useState } from "react";
import { ScriptPage } from "@/components/script-page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const candyOptions = [
  { value: "1h", label: "1H" },
  { value: "2h", label: "2H" },
  { value: "4h", label: "4H" },
  { value: "12h", label: "12H" },
  { value: "24h", label: "24H" },
] as const;

const Candy = () => {
  const [selectedCandy, setSelectedCandy] = useState("1h");

  return (
    <ScriptPage
      actions={[
        {
          label: "Debug Scan",
          scriptId: "general.candy.debug",
          args: () => [selectedCandy],
        },
      ]}
      title="Candy"
    >
      <div className="mb-4">
        <Select onValueChange={setSelectedCandy} value={selectedCandy}>
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
