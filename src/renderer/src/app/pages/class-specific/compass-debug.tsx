import { useState } from "react";
import { ScriptPage } from "@/components/script-page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMPASS_NODE_DEFS } from "@/types/compass";

const CompassDebug = () => {
  const [selectedNode, setSelectedNode] = useState("");

  return (
    <ScriptPage
      actions={[
        {
          label: "Discover Neighbors",
          scriptId: "classSpecific.compass.discover",
          runningLabel: "Discovering... (Click to stop)",
          disabled: !selectedNode,
          args: () => [selectedNode],
        },
        {
          label: "Discover All",
          scriptId: "classSpecific.compass.discoverAll",
          runningLabel: "Discovering All... (Click to stop)",
        },
      ]}
      title="Compass Debug"
    >
      <div className="mb-4">
        <label
          className="mb-1.5 block font-medium text-sm"
          htmlFor="node-select"
        >
          Node to Center
        </label>
        <Select onValueChange={setSelectedNode} value={selectedNode}>
          <SelectTrigger id="node-select">
            <SelectValue placeholder="Select a node..." />
          </SelectTrigger>
          <SelectContent>
            {COMPASS_NODE_DEFS.map((node) => (
              <SelectItem key={node.id} value={node.id}>
                {node.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </ScriptPage>
  );
};

export default CompassDebug;
