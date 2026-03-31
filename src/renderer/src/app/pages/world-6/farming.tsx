import { ScriptPage } from "@/components/script-page";

const Farming = () => (
  <ScriptPage
    actions={[
      { label: "Start Farming", scriptId: "world6.farming.start" },
      { label: "Lock/Unlock Crops", scriptId: "world6.farming.lockUnlock" },
    ]}
    title="Farming"
  />
);

export default Farming;
