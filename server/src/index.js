import express from "express";
import cors from "cors";
import morgan from "morgan";

import { load, isEmpty } from "./db.js";
import { HOSPITAL, BED_TYPES, BLOOD_GROUPS, GENDERS, SPECIALIZATIONS } from "./hospital.js";

import patientsRouter from "./routes/patients.js";
import doctorsRouter from "./routes/doctors.js";
import admissionsRouter from "./routes/admissions.js";
import dischargesRouter from "./routes/discharges.js";
import appointmentsRouter from "./routes/appointments.js";
import treatmentsRouter from "./routes/treatments.js";
import dashboardRouter from "./routes/dashboard.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

load();

// ---- meta ------------------------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", hospital: HOSPITAL.name, time: new Date().toISOString() });
});

/** Reference lists so the React forms never hard-code dropdown options. */
app.get("/api/meta", (req, res) => {
  res.json({
    hospital: HOSPITAL,
    bedTypes: BED_TYPES,
    bloodGroups: BLOOD_GROUPS,
    genders: GENDERS,
    specializations: SPECIALIZATIONS,
    timeSlots: ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM"],
    treatmentCategories: ["Medication", "Surgery", "Therapy", "Diagnostics", "Emergency Care", "Rehabilitation"],
  });
});

// ---- resources -------------------------------------------------------------

app.use("/api/patients", patientsRouter);
app.use("/api/doctors", doctorsRouter);
app.use("/api/admissions", admissionsRouter);
app.use("/api/discharges", dischargesRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/treatments", treatmentsRouter);
app.use("/api/dashboard", dashboardRouter);

app.use("/api", (req, res) => {
  res.status(404).json({ error: `No API route for ${req.method} ${req.originalUrl}` });
});

// ---- errors ----------------------------------------------------------------

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error("[error]", err);
  res.status(status).json({
    error: err.message || "Something went wrong",
    fields: err.fields,
  });
});

app.listen(PORT, () => {
  console.log(`\n  ${HOSPITAL.name} API`);
  console.log(`  ready on  http://localhost:${PORT}/api`);
  if (isEmpty()) {
    console.log(`\n  Database is empty. Run "npm run seed" for demo data.`);
  }
});
