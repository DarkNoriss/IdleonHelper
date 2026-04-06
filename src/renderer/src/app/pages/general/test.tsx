import { ScriptPage } from "@/components/script-page.tsx";

const Test = () => (
  <ScriptPage
    actions={[{ label: "Start Test", scriptId: "general.test.run" }]}
    title="Test"
  />
);

export default Test;
