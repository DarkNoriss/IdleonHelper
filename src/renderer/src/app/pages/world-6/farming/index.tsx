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
      {
        label: "Bean Trading - Trade Crops",
        scriptId: "world6.farming.beanTradingTradeCrops",
      },
      {
        label: "Bean Trading - Trade Crops (Debug)",
        scriptId: "world6.farming.beanTradingTradeCropsDebug",
      },
    ]}
    title="Farming"
  />
);

export default Farming;
