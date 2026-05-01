import { PageHead } from "@/components/terminal";
import { GrimoireOptimizerTab } from "./grimoire-optimizer-tab";

const Grimoire = () => {
  return (
    <>
      <PageHead
        description="optimal upgrade order across damage, accuracy, defence, hp, crit, or extra bones. rows are sorted by efficiency."
        path="class-specific / grimoire"
        title="grimoire"
      />
      <GrimoireOptimizerTab />
    </>
  );
};

export default Grimoire;
