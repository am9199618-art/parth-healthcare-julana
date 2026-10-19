import { execFileSync } from "node:child_process";

const GIT = "C:/Program Files/Git/cmd/git.exe";
const cwd = "C:/Surrender Redhu/parth-healthcare";
const run = (a) => execFileSync(GIT, a, { encoding: "utf8", cwd });

run(["add", "-A"]);

const staged = run(["diff", "--cached", "--name-only"]).trim().split(/\r?\n/).filter(Boolean);
const bad = staged.filter((f) => /\.env\.local$|db\.json$|^server\/data\//.test(f));
if (bad.length) {
  console.error("REFUSING to commit:", bad.join(", "));
  process.exit(1);
}
console.log(`staged ${staged.length} file(s):`);
for (const f of staged) console.log("  " + f);

const message = `Add light/dark theme with a header toggle

Adds a dark theme that covers the whole site.

Rather than adding \`dark:\` variants to every component, the Tailwind v4
palette is re-pointed inside a \`.dark\` scope. v4 compiles utilities to CSS
variables (.text-slate-800 becomes var(--color-slate-800)), so overriding the
variables re-themes everything at once. The slate scale is inverted on purpose
so the low numbers stay "backgrounds" and the high numbers stay "text".

- New \`bg-surface\` token for cards, modals and inputs, which sits between two
  slate steps and so cannot be expressed on the scale itself.
- Badges and stat cards use translucent colour fills in dark mode instead of
  near-white ones, which glared on dark backgrounds.
- ThemeContext stores the choice in localStorage and defaults to the operating
  system preference on first visit; also sets color-scheme so scrollbars and
  form controls match.
- Sun/moon toggle in the header, keyboard reachable with role=switch.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`;

run(["commit", "-m", message]);
run(["push", "origin", "main"]);
console.log("\npushed -> " + run(["rev-parse", "origin/main"]).trim());
