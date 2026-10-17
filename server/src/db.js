import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

/**
 * A tiny JSON-file database.
 *
 * The whole record set is kept in memory and flushed to disk atomically
 * (write to a temp file, then rename) so a crash mid-write can never leave
 * a half-written db.json behind.
 */

const EMPTY = {
  patients: [],
  doctors: [],
  admissions: [],
  discharges: [],
  appointments: [],
  treatments: [],
  counters: {
    patient: 1000,
    admission: 5000,
    discharge: 7000,
    appointment: 8000,
    treatment: 9000,
  },
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

let db = null;

export function load() {
  ensureDir();
  if (db) return db;

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      db = { ...structuredClone(EMPTY), ...JSON.parse(raw) };
      // Make sure every collection exists even for older files.
      for (const key of Object.keys(EMPTY)) {
        if (db[key] == null) db[key] = structuredClone(EMPTY[key]);
      }
    } catch (err) {
      console.error("[db] db.json is unreadable, starting fresh:", err.message);
      db = structuredClone(EMPTY);
    }
  } else {
    db = structuredClone(EMPTY);
    persist();
  }

  return db;
}

function persist() {
  ensureDir();
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DB_FILE);
}

/** Read a collection. */
export function table(name) {
  const d = load();
  if (!d[name]) throw new Error(`Unknown collection "${name}"`);
  return d[name];
}

/** Append a record and flush to disk. */
export function insert(name, record) {
  const rows = table(name);
  rows.push(record);
  persist();
  return record;
}

/** Patch a record by id. Returns the updated row or null. */
export function update(name, id, patch) {
  const rows = table(name);
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return null;
  rows[index] = { ...rows[index], ...patch, id: rows[index].id };
  persist();
  return rows[index];
}

/** Delete a record by id. Returns the removed row or null. */
export function remove(name, id) {
  const rows = table(name);
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return null;
  const [row] = rows.splice(index, 1);
  persist();
  return row;
}

/**
 * Monotonic per-collection id generator, e.g. PAT-1001, ADM-5001.
 * Kept in the counters object so ids never repeat even after deletes.
 */
export function nextId(kind, prefix) {
  const d = load();
  const n = d.counters[kind] + 1;
  d.counters[kind] = n;
  persist();
  return `${prefix}-${n}`;
}

/** Overwrite the whole database (used by the seeder). */
export function replaceAll(next) {
  db = { ...structuredClone(EMPTY), ...next };
  persist();
}

export function isEmpty() {
  const d = load();
  return (
    d.patients.length === 0 &&
    d.doctors.length === 0 &&
    d.admissions.length === 0 &&
    d.discharges.length === 0 &&
    d.appointments.length === 0 &&
    d.treatments.length === 0
  );
}
