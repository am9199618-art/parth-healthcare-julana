import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../firebase/auth.jsx";
import { Button, Field, Input, Spinner } from "../components/ui.jsx";
import { HOSPITAL_FALLBACK, ADMIN_USERNAME, ADMIN_EMAIL } from "../constants.js";

/**
 * Single administrator sign-in.
 *
 * Staff enter the username "admin" plus the password. The username is mapped
 * to the Firebase account here; the password is checked by Firebase and is
 * never stored in this app.
 */
export default function Login() {
  const { user, login, initialising, configured } = useAuth();
  const [username, setUsername] = useState("");
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

  // Already signed in - go straight to the dashboard instead of leaving the
  // user staring at the login form.
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (username.trim().toLowerCase() !== ADMIN_USERNAME) {
      setError("Username or password is incorrect.");
      return;
    }

    setBusy(true);
    try {
      await login(ADMIN_EMAIL, password);
    } catch (err) {
      const code = err?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("Username or password is incorrect.");
      } else if (code === "auth/operation-not-allowed" || code === "auth/configuration-not-found") {
        setError(
          "Sign-in is not switched on yet. Please contact the administrator.",
        );
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError("Username or password is incorrect.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-medical flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 shadow-lg shadow-brand-900/20">
            <svg className="h-8 w-8" viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <path d="M26 14h12v12h12v12H38v12H26V38H14V26h12z" fill="#fff" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">{HOSPITAL_FALLBACK.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {HOSPITAL_FALLBACK.city}, {HOSPITAL_FALLBACK.district}
          </p>
        </div>

        <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Admin Login</h2>
          <p className="mt-1 mb-5 text-sm text-slate-500">Enter your details to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Username" required>
              <Input
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            </Field>

            <Field label="Password" required>
              <Input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
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
              {busy ? "Signing in..." : "Login"}
            </Button>
          </form>

          {!configured ? (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              The website is not connected yet. Please contact the administrator.
            </p>
          ) : null}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          {HOSPITAL_FALLBACK.emergencyNote || "24x7 Emergency"}:{" "}
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {HOSPITAL_FALLBACK.emergency}
          </span>
        </p>
      </div>
    </div>
  );
}
