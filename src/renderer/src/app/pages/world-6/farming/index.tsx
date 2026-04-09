import { ScriptPage } from "@/components/script-page.tsx";

const Farming = () => (
  <ScriptPage
    actions={[
      {
        label: "Bean Trading - Get Tickets",
        scriptId: "world6.farming.beanTradingGetTickets",
      },
      {
        label: "Bean Trading - Trade Crops",
        scriptId: "world6.farming.beanTradingTradeCrops",
      },
    ]}
    title="Farming"
  />
);

export default Farming;
