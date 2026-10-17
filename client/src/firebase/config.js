import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase configuration comes from Vite env vars so no credentials are
 * committed to the repository.
 *
 * Copy .env.example to .env.local and fill in the values from
 * Firebase console > Project settings > Your apps > Web app > SDK setup.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True when every required Firebase value is present. */
export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.length > 0,
);

if (!isFirebaseConfigured) {
  console.warn(
    "[firebase] Missing VITE_FIREBASE_* values. " +
      "The app will use the local Express API instead. " +
      "Copy client/.env.example to client/.env.local to enable Firestore.",
  );
}

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export { app };
