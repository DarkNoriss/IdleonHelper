import { useEffect, useState } from "react";
import { Block, PageHead, RunBtn } from "@/components/terminal";

const Summoning = () => {
  const [isDev, setIsDev] = useState(false);
  useEffect(() => {
    window.api.app
      .isDev()
      .then(setIsDev)
      .catch(() => setIsDev(false));
  }, []);

  return (
    <>
      <PageHead path="world-6 / summoning" title="summoning" />
      <Block
        note="open the summoning arena in-game first. the script controls mouse and reads the board each turn."
        tag="scripts"
        title="summoning.scripts"
      >
        <div className="grid grid-cols-2 gap-2">
          <RunBtn
            label="start endless autobattler"
            scriptId="world6.summoning.startEndlessAutobattler"
          />
          <RunBtn
            label="start autobattler"
            scriptId="world6.summoning.startAutobattler"
          />
        </div>
      </Block>
      {isDev && (
        <Block
          note="visual probes for the board reader. dev-only."
          tag="debug"
          title="summoning.debug"
        >
          <div className="grid grid-cols-2 gap-2">
            <RunBtn
              label="debug - board range"
              scriptId="world6.summoning.debugBoardRange"
            />
            <RunBtn
              label="debug - board image"
              scriptId="world6.summoning.debugBoardImage"
            />
          </div>
        </Block>
      )}
    </>
  );
};

export default Summoning;
