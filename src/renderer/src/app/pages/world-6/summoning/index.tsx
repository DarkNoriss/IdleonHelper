import { ScriptPage } from "@/components/script-page.tsx";

const Summoning = () => (
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
      {
        label: "Debug - Board Range",
        scriptId: "world6.summoning.debugBoardRange",
      },
    ]}
    title="Summoning"
  />
);

export default Summoning;
