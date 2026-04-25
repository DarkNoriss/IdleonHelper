import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

const app = getApps()[0] ?? initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Persist auth across app restarts (Electron renderer = browser env, has IndexedDB).
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Ignore persistence errors (may fail in test environments)
});

export const firestore = getFirestore(app);
