import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

const app = getApps()[0] ?? initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Persist auth across app restarts (Electron renderer = browser env, has IndexedDB).
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Ignore persistence errors (may fail in test environments)
});

export const firestore = getFirestore(app);
// `_data/{uid}` lives in Firestore, but `_comp/{uid}` (companions),
// `_usgu/{uid}` (guild membership), and `_tournament/{uid}` live in the
// Realtime Database -- mirroring how IdleOn / IdleonToolbox split storage.
export const database = getDatabase(app);
