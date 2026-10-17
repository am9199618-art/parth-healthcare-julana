/**
 * End-to-end API smoke test.
 *   node scripts/test-api.js        (server must be running on :4000)
 *   node scripts/test-api.js --auto (starts the server, tests, stops it)
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:4000/api";

let pass = 0;
let fail = 0;

function check(label, condition, extra = "") {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${label} ${extra}`);
  }
}

async function api(method, endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

async function run() {
  console.log("\nParth Healthcare API - smoke test\n");

  const health = await api("GET", "/health");
  check("GET /health returns ok", health.status === 200 && health.body.status === "ok");

  const meta = await api("GET", "/meta");
  check("GET /meta lists specializations", meta.status === 200 && meta.body.specializations.length > 0);
  check("GET /meta includes hospital name", meta.body.hospital?.name?.includes("Parth"));

  const dash = await api("GET", "/dashboard");
  check("GET /dashboard returns stats", dash.status === 200 && typeof dash.body.stats.totalPatients === "number");
  check("dashboard counts active admissions", dash.body.stats.admittedPatients >= 0, JSON.stringify(dash.body.stats));

  // ---- patients
  const created = await api("POST", "/patients", {
    name: "Test Patient QA",
    age: 45,
    gender: "Male",
    phone: "+91 99999 88888",
    bloodGroup: "O+",
    city: "Julana",
  });
  check("POST /patients creates a record", created.status === 201 && created.body.id?.startsWith("PAT-"), JSON.stringify(created.body));

  const bad = await api("POST", "/patients", { name: "X", age: 999, gender: "Alien", phone: "abc" });
  check("POST /patients rejects invalid input with 400", bad.status === 400 && !!bad.body.fields, JSON.stringify(bad.body));

  const list = await api("GET", "/patients?search=Test%20Patient");
  check("GET /patients?search filters", list.status === 200 && list.body.patients.length >= 1);

  const one = await api("GET", `/patients/${created.body.id}`);
  check("GET /patients/:id returns linked records", one.status === 200 && "admissions" in one.body);

  const patched = await api("PUT", `/patients/${created.body.id}`, { city: "Julana City" });
  check("PUT /patients/:id updates", patched.status === 200 && patched.body.city === "Julana City");

  // ---- admission
  const admit = await api("POST", "/admissions", {
    patientId: created.body.id,
    bedType: "Private",
    ward: "Private Ward",
    bedNo: "P-99",
    reason: "Chest pain observation",
  });
  check("POST /admissions admits patient", admit.status === 201 && admit.body.status === "Active", JSON.stringify(admit.body));
  check("admission derives dailyCharge from bed type", admit.body.dailyCharge === 2500, String(admit.body.dailyCharge));

  const clash = await api("POST", "/admissions", {
    patientId: created.body.id,
    bedType: "Private",
    ward: "Private Ward",
    bedNo: "P-99",
    reason: "Duplicate bed",
  });
  check("POST /admissions blocks double-booked bed with 409", clash.status === 409, JSON.stringify(clash.body));

  const badPatient = await api("POST", "/admissions", { patientId: "PAT-0000", bedType: "General", reason: "x" });
  check("POST /admissions rejects unknown patient", badPatient.status === 404);

  // ---- treatment
  const treat = await api("POST", "/treatments", {
    patientId: created.body.id,
    treatmentName: "ECG Monitoring",
    category: "Diagnostics",
  });
  check("POST /treatments starts care plan", treat.status === 201 && treat.body.status === "Planned");

  const done = await api("PUT", `/treatments/${treat.body.id}`, { status: "Completed" });
  check("completing a treatment sets progress 100", done.status === 200 && done.body.progress === 100);

  // ---- appointments
  const doctors = await api("GET", "/doctors");
  const doctor = doctors.body.doctors[0];
  check("GET /doctors returns staff", doctors.status === 200 && doctors.body.count > 0);

  const appt = await api("POST", "/appointments", {
    patientName: "Test Patient QA",
    doctorId: doctor.id,
    date: new Date().toISOString().slice(0, 10),
    timeSlot: doctor.slots[0],
    reason: "Routine check-up",
  });
  check("POST /appointments books a slot", appt.status === 201 && appt.body.doctorName === doctor.name, JSON.stringify(appt.body));

  const dup = await api("POST", "/appointments", {
    patientName: "Someone Else",
    doctorId: doctor.id,
    date: new Date().toISOString().slice(0, 10),
    timeSlot: doctor.slots[0],
    reason: "Same slot",
  });
  check("POST /appointments blocks double booking with 409", dup.status === 409, JSON.stringify(dup.body));

  const slots = await api("GET", `/appointments/slots?doctorId=${doctor.id}&date=${new Date().toISOString().slice(0, 10)}`);
  check("GET /appointments/slots marks booked slot", slots.status === 200 && slots.body.slots.find((s) => s.slot === doctor.slots[0])?.booked === true);

  const badDate = await api("POST", "/appointments", { patientName: "X Y", doctorId: doctor.id, date: "16/10/2026", timeSlot: "10:00 AM" });
  check("POST /appointments rejects bad date format", badDate.status === 400);

  const confirmed = await api("PUT", `/appointments/${appt.body.id}`, { status: "Confirmed" });
  check("PUT /appointments updates status", confirmed.status === 200 && confirmed.body.status === "Confirmed");

  // ---- discharge
  const dis = await api("POST", "/discharges", {
    admissionId: admit.body.id,
    finalDiagnosis: "Stable angina",
    conditionAtDischarge: "Stable",
    advice: "Rest and review in 7 days.",
  });
  check("POST /discharges records summary", dis.status === 201 && dis.body.totalBill > 0, JSON.stringify(dis.body));

  const stillActive = await api("GET", `/admissions/${admit.body.id}`);
  check("discharge closes the admission", stillActive.body.admission.status === "Discharged");

  const twice = await api("POST", "/discharges", { admissionId: admit.body.id, finalDiagnosis: "Again" });
  check("double discharge is rejected with 409", twice.status === 409);

  const bedFreed = await api("POST", "/admissions", {
    patientId: created.body.id,
    bedType: "Private",
    ward: "Private Ward",
    bedNo: "P-99",
    reason: "Re-admitted after bed freed",
  });
  check("bed is reusable after discharge", bedFreed.status === 201);

  // ---- cleanup
  check("DELETE /treatments/:id works", (await api("DELETE", `/treatments/${treat.body.id}`)).status === 200);
  check("DELETE /appointments/:id works", (await api("DELETE", `/appointments/${appt.body.id}`)).status === 200);
  const del = await api("DELETE", `/patients/${created.body.id}?force=true`);
  check("DELETE /patients/:id?force=true works", del.status === 200);

  const gone = await api("GET", `/patients/${created.body.id}`);
  check("deleted patient returns 404", gone.status === 404);

  const noRoute = await api("GET", "/nope");
  check("unknown API route returns 404 JSON", noRoute.status === 404 && !!noRoute.body.error);

  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  return fail;
}

const auto = process.argv.includes("--auto");

if (auto) {
  const child = spawn(process.execPath, [path.join(__dirname, "..", "src", "index.js")], {
    stdio: "ignore",
  });
  await new Promise((r) => setTimeout(r, 1500));
  const failed = await run().finally(() => child.kill());
  process.exit(failed > 0 ? 1 : 0);
} else {
  process.exit((await run()) > 0 ? 1 : 0);
}
