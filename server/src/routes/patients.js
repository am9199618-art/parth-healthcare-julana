import { Router } from "express";
import { table, insert, update, remove, nextId } from "../db.js";
import { validate, matchesSearch, NotFoundError, asyncHandler } from "../validate.js";

const router = Router();

const SEARCHABLE = ["id", "name", "phone", "email", "gender", "bloodGroup", "city", "diagnosis"];

// GET /api/patients?search=&gender=&bloodGroup=
router.get(
  "/",
  asyncHandler((req, res) => {
    const { search, gender, bloodGroup } = req.query;
    let rows = table("patients");

    rows = rows.filter((r) => matchesSearch(r, search, SEARCHABLE));
    if (gender) rows = rows.filter((r) => r.gender === gender);
    if (bloodGroup) rows = rows.filter((r) => r.bloodGroup === bloodGroup);

    rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json({ count: rows.length, patients: rows });
  })
);

// GET /api/patients/:id  (patient + their admissions, treatments, appointments)
router.get(
  "/:id",
  asyncHandler((req, res) => {
    const patient = table("patients").find((p) => p.id === req.params.id);
    if (!patient) throw new NotFoundError(`No patient with id ${req.params.id}`);

    const admissions = table("admissions").filter((a) => a.patientId === patient.id);
    const admissionIds = new Set(admissions.map((a) => a.id));

    res.json({
      patient,
      admissions,
      discharges: table("discharges").filter((d) => admissionIds.has(d.admissionId)),
      treatments: table("treatments").filter((t) => t.patientId === patient.id),
      appointments: table("appointments").filter((a) => a.patientId === patient.id),
    });
  })
);

// POST /api/patients
router.post(
  "/",
  asyncHandler((req, res) => {
    const data = validate("patients", req.body);
    const record = {
      ...data,
      id: nextId("patient", "PAT"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    insert("patients", record);
    res.status(201).json(record);
  })
);

// PUT /api/patients/:id
router.put(
  "/:id",
  asyncHandler((req, res) => {
    const existing = table("patients").find((p) => p.id === req.params.id);
    if (!existing) throw new NotFoundError(`No patient with id ${req.params.id}`);
    const data = validate("patients", req.body, { partial: true });
    const updated = update("patients", req.params.id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    res.json(updated);
  })
);

// DELETE /api/patients/:id
router.delete(
  "/:id",
  asyncHandler((req, res) => {
    const patient = table("patients").find((p) => p.id === req.params.id);
    if (!patient) throw new NotFoundError(`No patient with id ${req.params.id}`);

    const admissionIds = new Set(
      table("admissions").filter((a) => a.patientId === patient.id).map((a) => a.id),
    );
    const blockers = [];
    if (admissionIds.size > 0) blockers.push(`${admissionIds.size} admission(s)`);

    const openAppointments = table("appointments").filter(
      (a) => a.patientId === patient.id && a.status === "Pending",
    ).length;
    if (openAppointments) blockers.push(`${openAppointments} pending appointment(s)`);

    if (blockers.length && req.query.force !== "true") {
      return res.status(409).json({
        error: `Cannot delete this patient while they still have ${blockers.join(" and ")}. Re-run with ?force=true to delete anyway.`,
      });
    }

    if (req.query.force === "true") {
      const d = table("admissions");
      for (let i = d.length - 1; i >= 0; i -= 1) if (d[i].patientId === patient.id) d.splice(i, 1);
    }

    remove("patients", req.params.id);
    res.json({ deleted: patient.id });
  })
);

export default router;
