/**
 * Checks whether Email/Password is enabled and whether a given account can
 * actually sign in, using the public Identity Toolkit endpoints.
 * Prints no tokens or password hashes.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const PROJECT = "parth-health-care";
const IDENTITY = "https://identitytoolkit.googleapis.com";
const CONFIG = path.join(homedir(), ".config", "configstore", "firebase-tools.json");

// ---- 1. provider status (needs an admin token to read the config)
const { tokens } = JSON.parse(readFileSync(CONFIG, "utf8"));
const tokRes = await fetch("https://www.googleapis.com/oauth2/v3/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
    client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
    scope: tokens.scope,
  }),
});
const tok = await tokRes.json();

console.log("=== 1. Email/Password provider ===");
if (!tok.access_token) {
  console.log("  could not read admin config (no token)");
} else {
  const r = await fetch(`${IDENTITY}/v2/projects/${PROJECT}/config`, {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  });
  if (!r.ok) {
    console.log(`  config not readable: ${r.status} ${(await r.text()).replace(/\s+/g, " ").slice(0, 120)}`);
  } else {
    const cfg = await r.json();
    console.log(`  email.enabled        = ${cfg.signIn?.email?.enabled}`);
    console.log(`  passwordRequired     = ${cfg.signIn?.email?.passwordRequired}`);
    console.log(`  emailLinkSignIn      = ${cfg.signIn?.emailLink?.enabled}`);
  }
}

// ---- 2. can the account actually sign in?
const API_KEY = "AIzaSyA8vsNhBb-TFlwqWBQDuJyy_7f-aSQy9C8";
const email = process.argv[2];
const password = process.argv[3];

console.log(`\n=== 2. Sign-in test for ${email} ===`);
if (!email || !password) {
  console.log("  skipped (no credentials given)");
  process.exit(0);
}

const res = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  },
);
const body = await res.json();

if (res.ok && body.idToken) {
  console.log("  SUCCESS - this account can sign in.");
  console.log(`  localId = ${body.localId}`);
} else {
  const msg = body?.error?.message || JSON.stringify(body);
  const explain = {
    CONFIGURATION_NOT_FOUND: "Email/Password is still DISABLED in the Firebase console.",
    INVALID_LOGIN_CREDENTIALS: "That password is wrong for this account.",
    EMAIL_NOT_FOUND: "No account exists with that email.",
    USER_DISABLED: "That account has been disabled.",
    OPERATION_NOT_ALLOWED: "Email/Password sign-in is not enabled.",
    INVALID_EMAIL: "That email address is not valid.",
  };
  console.log(`  FAILED - ${msg}`);
  console.log(`  meaning: ${explain[body?.error?.message] || "see message above"}`);
}
console.log("");
