import { execFileSync } from "node:child_process";

const GIT = "C:/Program Files/Git/cmd/git.exe";
const cwd = "C:/Surrender Redhu/parth-healthcare";
const run = (args) => execFileSync(GIT, args, { encoding: "utf8", cwd });

run(["add", "-A"]);

// Guard: never let a credential reach the public repo.
const staged = run(["diff", "--cached", "--name-only"]).trim().split(/\r?\n/).filter(Boolean);
const bad = staged.filter((f) => /\.env\.local$|db\.json$|^server\/data\//.test(f));
if (bad.length) {
  console.error("REFUSING to commit:", bad.join(", "));
  process.exit(1);
}
console.log(`staged ${staged.length} file(s), no credentials included`);

const message = `Simplify to a single admin login

Replace the staff sign-in screen with one Admin Login form:
- Username field (the username is mapped to the Firebase account in code)
- Password field, checked by Firebase

The password is intentionally not stored anywhere in this repository. Firebase
web config values are public, so hard-coding a password here would expose every
patient record to anyone who can read the public repository.

Also: the header now shows a fixed "Administrator" identity instead of a
per-staff name, and sign-in failures are reported generically.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`;

run(["commit", "-m", message]);
run(["push", "origin", "main"]);

console.log("\npushed. remote head:", run(["rev-parse", "origin/main"]).trim());
console.log("files changed:", staged.join(", "));
