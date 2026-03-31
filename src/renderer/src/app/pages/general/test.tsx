import { ScriptPage } from "@/components/script-page";

export const Test = () => (
  <ScriptPage
    actions={[{ label: "Start Test", scriptId: "general.test.run" }]}
    title="Test"
  />
);

export default Test;
