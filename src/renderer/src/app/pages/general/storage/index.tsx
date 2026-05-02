import { Block, PageHead, RunBtn } from "@/components/terminal";

const StoreItems = () => (
  <>
    <PageHead path="general / store-items" title="store-items" />
    <Block
      note="open the shop on any town NPC first. script rotates through all characters that have shop-list entries configured."
      tag="script"
      title="store.run"
    >
      <div className="flex items-center gap-3">
        <RunBtn label="start store-items" scriptId="general.storeItems.run" />
        <div className="font-mono text-[10.5px] text-text-muted">
          tip: configure the shop list per character in{" "}
          <span className="text-amber">~/config/shops.json</span>
        </div>
      </div>
    </Block>
  </>
);

export default StoreItems;
