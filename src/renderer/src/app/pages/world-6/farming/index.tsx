import { ScriptPage } from "@/components/script-page.tsx";

const Farming = () => (
  <ScriptPage
    actions={[
      { label: "Start Farming", scriptId: "world6.farming.start" },
      { label: "Lock/Unlock Crops", scriptId: "world6.farming.lockUnlock" },
      {
        label: "Bean Trading - Get Tickets",
        scriptId: "world6.farming.beanTradingGetTickets",
      },
    ]}
    title="Farming"
  />
);

export default Farming;
