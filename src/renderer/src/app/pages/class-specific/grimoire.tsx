import { GrimoireOptimizerTab } from "./grimoire-optimizer-tab";

const Grimoire = () => {
  return (
    <div className="flex flex-col gap-3 p-3">
      <h1 className="font-mono text-sm text-text-dim uppercase tracking-wide">
        grimoire upgrade optimizer
      </h1>
      <GrimoireOptimizerTab />
    </div>
  );
};

export default Grimoire;
