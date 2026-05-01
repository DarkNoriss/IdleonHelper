import { PageHead } from "@/components/terminal";
import { CompassOptimizerTab } from "./compass-optimizer-tab";

const Compass = () => {
  return (
    <>
      <PageHead
        description="optimal upgrade order across damage, dust, accuracy, defence, crit, attack speed, or hp. rows are sorted by efficiency. queue affordable steps to the run-upgrader to drive the in-game compass."
        path="class-specific / compass"
        title="compass"
      />
      <CompassOptimizerTab />
    </>
  );
};

export default Compass;
