import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./config.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    if (!auth) {
      // No Firebase config (local Express mode): treat everyone as signed in.
      setInitialising(false);
      return undefined;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitialising(false);
    });
  }, []);

  async function login(email, password) {
    if (!auth) throw new Error("Firebase is not configured.");
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    if (auth) await signOut(auth);
  }

  async function updateDisplayName(name) {
    if (auth && user) await updateProfile(user, { displayName: name });
  }

  const value = { user, initialising, login, logout, updateDisplayName, configured: isFirebaseConfigured };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
