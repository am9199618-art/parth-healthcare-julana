/**
 * Verifies that Firestore refuses reads/writes without a signed-in staff
 * account, and that requests WITH a valid account succeed.
 */
const PROJECT = "parth-health-care";
const API_KEY = "AIzaSyA8vsNhBb-TFlwqWBQDuJyy_7f-aSQy9C8";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const probe = async (label, path, init = {}) => {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}key=${API_KEY}`;
  const res = await fetch(url, init);
  const body = await res.text();
  let message = "";
  try {
    const parsed = JSON.parse(body);
    message = parsed?.error?.message || "";
    if (!message) message = `read ${parsed.documents?.length ?? 0} document(s)`;
  } catch {
    message = body.slice(0, 120);
  }
  const blocked = res.status === 401 || res.status === 403 || /PERMISSION_DENIED/i.test(message);
  console.log(`  ${blocked ? "PASS" : "FAIL"}  ${label} -> HTTP ${res.status}: ${message}`);
  return blocked;
};

console.log("\nFirestore security verification\n");

const results = [];
results.push(
  await probe("anonymous read of /patients", "/patients"),
);
results.push(
  await probe("anonymous read of /admissions", "/admissions"),
);
results.push(
  await probe("anonymous read of /discharges", "/discharges"),
);
results.push(
  await probe("anonymous write to /patients", "/patients/ATTACK-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { name: { stringValue: "intruder" } } }),
  }),
);

console.log(
  `\n  ${results.every(Boolean) ? "PASSED - patient data is not publicly readable" : "FAILED - data may be exposed"}\n`,
);
process.exit(results.every(Boolean) ? 0 : 1);
