/**
 * Contract check: the Firestore backend must expose exactly the same method
 * surface as the Express HTTP backend, because every page is written against
 * the shared facade in src/api/index.js.
 *
 * Both modules are loaded through Vite's SSR loader so `import.meta.env`
 * resolves the same way it does in a build. Only shapes are compared - no
 * network calls are made.
 */
import { createServer } from "vite";

/** Low-level HTTP helpers on the Express client. Pages never call these
 *  directly, so they are deliberately not part of the shared contract. */
const HTTP_ONLY = new Set(["get", "post", "put", "del"]);

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.log(`  FAIL  ${msg}`);
};
const pass = (msg) => console.log(`  PASS  ${msg}`);

try {
  const [{ api: httpApi }, { firestoreApi }] = await Promise.all([
    server.ssrLoadModule("/src/api/client.js"),
    server.ssrLoadModule("/src/firebase/firestoreApi.js"),
  ]);

  console.log("\nBackend contract check (Express <-> Firestore)\n");

  // ---- namespaces
  const httpNs = Object.keys(httpApi).filter((k) => !HTTP_ONLY.has(k)).sort();
  const fsNs = Object.keys(firestoreApi).sort();

  const missingNs = httpNs.filter((k) => !fsNs.includes(k));
  const extraNs = fsNs.filter((k) => !httpNs.includes(k));

  if (missingNs.length || extraNs.length) {
    fail("top-level namespaces differ");
    if (missingNs.length) console.log(`        missing in firestore: ${missingNs.join(", ")}`);
    if (extraNs.length) console.log(`        extra in firestore:   ${extraNs.join(", ")}`);
  } else {
    pass(`namespaces match: ${httpNs.join(", ")}`);
  }

  // ---- methods per namespace
  for (const ns of httpNs) {
    const httpValue = httpApi[ns];
    const fsValue = firestoreApi[ns];

    // Some namespaces (dashboard, meta) are a single function, not a group.
    if (typeof httpValue === "function") {
      if (typeof fsValue !== "function") {
        fail(`${ns} is a function on express but not on firestore`);
      } else {
        pass(`${ns}() is a function on both`);
      }
      continue;
    }

    const httpMethods = Object.keys(httpValue ?? {}).filter((m) => typeof httpValue[m] === "function").sort();
    const fsMethods = Object.keys(fsValue ?? {}).filter((m) => typeof fsValue[m] === "function").sort();

    const missing = httpMethods.filter((m) => !fsMethods.includes(m));
    const extra = fsMethods.filter((m) => !httpMethods.includes(m));

    if (missing.length || extra.length) {
      fail(`${ns}`);
      if (missing.length) console.log(`        missing in firestore: ${missing.join(", ")}`);
      if (extra.length) console.log(`        extra in firestore:   ${extra.join(", ")}`);
    } else {
      pass(`${ns} -> ${httpMethods.join(", ")}`);
    }
  }

  // ---- arity sanity. `Function.length` ignores destructured and defaulted
  //      parameters, so 0 is treated as "accepts anything" and skipped.
  for (const ns of httpNs) {
    const httpValue = httpApi[ns];
    if (typeof httpValue === "function") {
      const a = httpValue.length;
      const b = firestoreApi[ns]?.length;
      if (a && b && a !== b) fail(`${ns} arity ${a} (express) vs ${b} (firestore)`);
      continue;
    }
    for (const m of Object.keys(httpValue ?? {}).filter((k) => typeof httpValue[k] === "function")) {
      const a = httpValue[m].length;
      const b = firestoreApi[ns]?.[m]?.length;
      if (a && b && a !== b) fail(`${ns}.${m} arity ${a} (express) vs ${b} (firestore)`);
    }
  }
  if (failures === 0) pass("method arity matches for every shared method");
} finally {
  await server.close();
}

console.log(`\n  ${failures === 0 ? "backends are in sync" : `${failures} problem(s)`}\n`);
process.exit(failures === 0 ? 0 : 1);
