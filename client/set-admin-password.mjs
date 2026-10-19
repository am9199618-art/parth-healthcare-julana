/**
 * Sets the admin account's password via the Identity Toolkit admin API, so it
 * can be done without the Firebase console.
 *
 * Usage: node set-admin-password.mjs <localId> <newPassword>
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const PROJECT = "parth-health-care";
const CONFIG = path.join(homedir(), ".config", "configstore", "firebase-tools.json");

const localId = process.argv[2];
const newPassword = process.argv[3];

if (!localId || !newPassword || newPassword.length < 6) {
  console.error("Usage: node set-admin-password.mjs <localId> <password>  (min 6 chars)");
  process.exit(1);
}

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
if (!tok.access_token) throw new Error("could not get an admin token");

const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${tok.access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    localId,
    password: newPassword,
    validSince: Math.floor(Date.now() / 1000) - 60,
  }),
});

const body = await res.text();
if (!res.ok) {
  console.log(`FAILED: ${res.status} ${body.replace(/\s+/g, " ").slice(0, 300)}`);
  process.exit(1);
}

const parsed = JSON.parse(body);
const safe = { ...parsed };
delete safe.idToken;
delete safe.refreshToken;
console.log("password updated for localId:", localId);
console.log("response:", JSON.stringify(safe).slice(0, 200));
