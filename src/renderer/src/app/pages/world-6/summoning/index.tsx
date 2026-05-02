import { useEffect, useState } from "react";
import { Block, BlockActions, PageHead, RunBtn } from "@/components/terminal";

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
      <div className="grid grid-cols-2 gap-2">
        <Block
          note="runs a single match, then stops. open the summoning arena in-game first."
          tag="script"
          title="summoning.single"
        >
          <BlockActions>
            <RunBtn
              label="start autobattler"
              scriptId="world6.summoning.startAutobattler"
            />
          </BlockActions>
        </Block>
        <Block
          note="loops matches back-to-back. open the summoning arena in-game first."
          tag="script"
          title="summoning.endless"
        >
          <BlockActions>
            <RunBtn
              label="start endless autobattler"
              scriptId="world6.summoning.startEndlessAutobattler"
            />
          </BlockActions>
        </Block>
      </div>
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
