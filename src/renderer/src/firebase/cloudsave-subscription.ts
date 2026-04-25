import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { useConnectionStore } from "@/store/connection";
import { useRawJsonStore } from "@/store/raw-json";
import { firestore } from "./client";

const MAX_CONSECUTIVE_ERRORS = 3;

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
      const data = snap.data() as { data?: unknown; lastUpdated?: number };
      if (data.data !== undefined) {
        useRawJsonStore
          .getState()
          .setRawJson(JSON.stringify({ data: data.data }));
      }
      conn.setLastUpdated(
        typeof data.lastUpdated === "number" ? data.lastUpdated : Date.now()
      );
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
