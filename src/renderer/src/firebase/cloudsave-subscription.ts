import { ref as dbRef, get, off, onValue } from "firebase/database";
import { doc, getDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { useConnectionStore } from "@/store/connection";
import { useRawJsonStore } from "@/store/raw-json";
import { database, firestore } from "./client";

const MAX_CONSECUTIVE_ERRORS = 3;

// Per signed-in user we read TWO storage backends -- mirroring how IdleOn /
// IdleonToolbox split persistence:
//   - `_data/{uid}` lives in **Firestore**. This is the main game state with
//     flat top-level keys (`Sushi`, `OptLacc`, `Atoms`, ...). Mirrored into
//     the envelope under `data`.
//   - `_comp/{uid}` lives in **Realtime Database** (NOT Firestore). Companion
//     / pet state -- `{ d, e, l[], o, p, s, t, x, y }`. Mirrored under
//     `companion`.
//
// Both subscriptions update private module-scoped caches; whenever EITHER
// fires, we rebuild the full envelope JSON and push it to the raw-json store.
// This keeps the persisted shape consistent regardless of which source updated.
//
// Error handling: companion failures are non-essential -- they don't escalate
// the connection state to "error" because most parsers run fine without it.
// Only `_data/{uid}` failures bump the error counter.

type CloudsaveDoc = Record<string, unknown> & { lastUpdated?: number };
type CompanionDoc = Record<string, unknown>;

let latestDataDoc: CloudsaveDoc | null = null;
let latestCompanionDoc: CompanionDoc | null = null;

const rebuildEnvelope = (): void => {
  if (!latestDataDoc) {
    return;
  }
  const lastUpdated =
    typeof latestDataDoc.lastUpdated === "number"
      ? latestDataDoc.lastUpdated
      : Date.now();
  const envelope = {
    data: latestDataDoc,
    charNames: null,
    companion: latestCompanionDoc,
    guildData: null,
    tournament: null,
    serverVars: null,
    accountCreateTime: null,
    lastUpdated,
    extraData: null,
  };
  useRawJsonStore.getState().setRawJson(JSON.stringify(envelope));
  useConnectionStore.getState().setLastUpdated(lastUpdated);
};

export const subscribeToCloudsave = (uid: string): Unsubscribe => {
  // Reset caches on each (re)subscribe -- switching accounts shouldn't leak
  // companion state from the previous user into the new envelope.
  latestDataDoc = null;
  latestCompanionDoc = null;

  const dataRef = doc(firestore, "_data", uid);
  const compRef = dbRef(database, `_comp/${uid}`);

  const unsubData = onSnapshot(
    dataRef,
    { includeMetadataChanges: true },
    (snap) => {
      const conn = useConnectionStore.getState();
      conn.resetErrors();
      conn.setStale(snap.metadata.fromCache);

      if (!snap.exists()) {
        latestDataDoc = null;
        conn.setLastUpdated(null);
        return;
      }
      latestDataDoc = snap.data() as CloudsaveDoc;
      rebuildEnvelope();
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

  const compListener = onValue(
    compRef,
    (snap) => {
      latestCompanionDoc = snap.exists() ? (snap.val() as CompanionDoc) : null;
      rebuildEnvelope();
    },
    () => {
      // Companion doc is non-essential; reset cache and keep going.
      latestCompanionDoc = null;
      rebuildEnvelope();
    }
  );

  return () => {
    unsubData();
    off(compRef, "value", compListener);
    latestDataDoc = null;
    latestCompanionDoc = null;
  };
};

// One-shot fetch of the current cloudsave + companion data. Used to repopulate
// after the user manually clears local state -- listeners won't re-fire unless
// the underlying doc changes, so we explicitly read once.
export const refreshCloudsave = async (uid: string): Promise<void> => {
  const dataRef = doc(firestore, "_data", uid);
  const compRef = dbRef(database, `_comp/${uid}`);

  const [dataSnap, compSnap] = await Promise.all([
    getDoc(dataRef),
    get(compRef).catch(() => null),
  ]);

  if (!dataSnap.exists()) {
    useConnectionStore.getState().setLastUpdated(null);
    return;
  }

  latestDataDoc = dataSnap.data() as CloudsaveDoc;
  latestCompanionDoc = compSnap?.exists()
    ? (compSnap.val() as CompanionDoc)
    : null;
  rebuildEnvelope();
};
