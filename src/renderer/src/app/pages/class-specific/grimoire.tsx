import { PageHead } from "@/components/terminal";
import { GrimoireOptimizerTab } from "./grimoire-optimizer-tab";

const Grimoire = () => {
  return (
    <>
      <PageHead path="class-specific / grimoire" title="grimoire" />
      <GrimoireOptimizerTab />
    </>
  );
};

export default Grimoire;
