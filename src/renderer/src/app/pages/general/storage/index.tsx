import { Block, PageHead, RunBtn } from "@/components/terminal";

const StoreItems = () => (
  <>
    <PageHead path="general / store-items" title="store-items" />
    <Block
      note="open the shop on any town NPC first. script rotates through all characters that have shop-list entries configured."
      tag="script"
      title="store.run"
    >
      <RunBtn label="start store-items" scriptId="general.storeItems.run" />
    </Block>
  </>
);

export default StoreItems;
