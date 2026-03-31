import { ScriptPage } from "@/components/script-page";

export const Summoning = () => (
  <ScriptPage
    actions={[
      {
        label: "Start Endless Autobattler",
        scriptId: "world6.summoning.startEndlessAutobattler",
      },
      {
        label: "Start Autobattler",
        scriptId: "world6.summoning.startAutobattler",
      },
    ]}
    title="Summoning"
  />
);

export default Summoning;
