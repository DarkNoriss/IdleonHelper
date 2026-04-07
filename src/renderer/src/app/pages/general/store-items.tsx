import { ScriptPage } from "@/components/script-page.tsx";

const StoreItems = () => (
  <ScriptPage
    actions={[
      { label: "Start Store Items", scriptId: "general.storeItems.run" },
    ]}
    title="Store Items"
  />
);

export default StoreItems;
