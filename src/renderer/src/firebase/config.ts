// Public client config for the game's official Firebase project (idlemmo).
// Values are mirrored from IdleonToolbox's bundle. Public-by-design — security
// is enforced via Firestore rules, not by hiding these.
export const firebaseConfig = {
  apiKey: "AIzaSyAU62kOE6xhSrFqoXQPv6_WHxYilmoUxDk",
  authDomain: "idlemmo.firebaseapp.com",
  databaseURL: "https://idlemmo.firebaseio.com",
  projectId: "idlemmo",
  storageBucket: "idlemmo.appspot.com",
} as const;
