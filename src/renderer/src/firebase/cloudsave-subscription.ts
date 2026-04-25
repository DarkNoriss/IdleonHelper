import { doc, getDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { useConnectionStore } from "@/store/connection";
import { useRawJsonStore } from "@/store/raw-json";
import { firestore } from "./client";

const MAX_CONSECUTIVE_ERRORS = 3;

// The Firestore `_data/{uid}` document IS the game state — top-level keys are
// flat (e.g. `GemItemsPurchased`, `CogM`, `Guild`). Our existing parsers expect
// the idleontoolbox.com export shape `{ data: {...} }`, so we wrap the full
// document under a `data` key before persisting.
type CloudsaveDoc = Record<string, unknown> & { lastUpdated?: number };

const applyCloudsaveDoc = (docData: CloudsaveDoc): void => {
  useRawJsonStore.getState().setRawJson(JSON.stringify({ data: docData }));
  useConnectionStore
    .getState()
    .setLastUpdated(
      typeof docData.lastUpdated === "number" ? docData.lastUpdated : Date.now()
    );
};

export const subscribeToCloudsave = (uid: string): Unsubscribe => {
  const ref = doc(firestore, "_data", uid);
  return onSnapshot(
    ref,
    { includeMetadataChanges: true },
    (snap) => {
      const conn = useConnectionStore.getState();
      conn.resetErrors();
      conn.setStale(snap.metadata.fromCache);

      if (!snap.exists()) {
        conn.setLastUpdated(null);
        return;
      }
      applyCloudsaveDoc(snap.data() as CloudsaveDoc);
    },
    (err) => {
      const conn = useConnectionStore.getState();
      conn.bumpError();
      const consecutive = useConnectionStore.getState().consecutiveErrors;
      if (consecutive >= MAX_CONSECUTIVE_ERRORS) {
        conn.setStatus("error");
        conn.setError(`cloudsave subscription failed: ${err.message}`);
      } else {
        conn.setStatus("reconnecting");
      }
    }
  );
};

// One-shot fetch of the current cloudsave doc. Used to repopulate after the
// user manually clears local state -- onSnapshot won't re-fire unless the doc
// changes, so we explicitly read once.
export const refreshCloudsave = async (uid: string): Promise<void> => {
  const ref = doc(firestore, "_data", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    useConnectionStore.getState().setLastUpdated(null);
    return;
  }
  applyCloudsaveDoc(snap.data() as CloudsaveDoc);
};
