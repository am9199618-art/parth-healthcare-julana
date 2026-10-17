import { useState } from "react";
import { useAuth } from "../firebase/auth.jsx";
import { backend } from "../api/index.js";
import { Button, Field, Input, Spinner } from "../components/ui.jsx";
import { HOSPITAL_FALLBACK } from "../constants.js";

export default function Login() {
  const { login, initialising, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (initialising) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      const code = err?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("Incorrect email or password.");
      } else if (code === "auth/invalid-email") {
        setError("Enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(err?.message || "Could not sign in.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-medical flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 shadow-lg shadow-brand-900/20">
            <svg className="h-8 w-8" viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <path d="M26 14h12v12h12v12H38v12H26V38H14V26h12z" fill="#fff" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">{HOSPITAL_FALLBACK.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Main Hospital Road, {HOSPITAL_FALLBACK.city}, {HOSPITAL_FALLBACK.district}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Staff Sign In</h2>
          <p className="mt-1 mb-5 text-sm text-slate-500">
            Patient records are confidential. Sign in with your staff account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@parthhealthcare.in"
                autoComplete="username"
                required
              />
            </Field>

            <Field label="Password" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                required
              />
            </Field>

            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={busy || !configured} className="w-full">
              {busy ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {!configured ? (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Firebase is not configured, so sign-in is disabled. Add the VITE_FIREBASE_* values to
              client/.env.local to enable staff login.
            </p>
          ) : null}

          <p className="mt-5 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
            Data source: {backend === "firestore" ? "Firebase Firestore" : "Local Express API"}
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          24x7 Emergency: {HOSPITAL_FALLBACK.emergency} &middot; {HOSPITAL_FALLBACK.phone}
        </p>
      </div>
    </div>
  );
}
