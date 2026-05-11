import { Tabs } from "@base-ui/react/tabs";
import { useState } from "react";
import { PageHead, TermTabs } from "@/components/terminal";
import { PrismaticBubblesTab } from "./prismatic";
import { AlchemyUpgradeTab } from "./upgrade";

type ActiveTab = "upgrade" | "prismatic";

const TABS = [
  { value: "upgrade", label: "upgrade" },
  { value: "prismatic", label: "prismatic" },
] as const satisfies readonly { value: ActiveTab; label: string }[];

const Alchemy = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("upgrade");

  return (
    <>
      <PageHead path="world-2 / alchemy" title="alchemy" />
      <TermTabs onValueChange={setActiveTab} tabs={TABS} value={activeTab}>
        <Tabs.Panel value="upgrade">
          <AlchemyUpgradeTab />
        </Tabs.Panel>
        <Tabs.Panel value="prismatic">
          <PrismaticBubblesTab />
        </Tabs.Panel>
      </TermTabs>
    </>
  );
};

export default Alchemy;
