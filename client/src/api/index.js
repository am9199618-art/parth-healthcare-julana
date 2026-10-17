import { api as httpApi } from "./client.js";
import { firestoreApi } from "../firebase/firestoreApi.js";
import { isFirebaseConfigured } from "../firebase/config.js";

/**
 * Chooses the active backend.
 *
 *   VITE_DATA_BACKEND=api        -> local Express server (default)
 *   VITE_DATA_BACKEND=firestore  -> Firebase Firestore
 *
 * When Firestore is selected but the Firebase config is missing we fall back
 * to the Express API rather than crashing, so the app still boots in dev.
 */
const preference = import.meta.env.VITE_DATA_BACKEND || (isFirebaseConfigured ? "firestore" : "api");

export const backend = preference === "firestore" && isFirebaseConfigured ? "firestore" : "api";

if (preference === "firestore" && !isFirebaseConfigured) {
  console.warn(
    "[api] VITE_DATA_BACKEND=firestore but Firebase is not configured. Falling back to the Express API.",
  );
}

export const api = backend === "firestore" ? firestoreApi : httpApi;
