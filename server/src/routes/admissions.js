import { Router } from "express";
import { table, insert, update, remove, nextId } from "../db.js";
import { validate, matchesSearch, NotFoundError, asyncHandler } from "../validate.js";
import { BED_TYPES } from "../hospital.js";

const router = Router();

const SEARCHABLE = ["id", "patientId", "patientName", "ward", "bedNo", "reason", "status"];
const DAILY_RATES = {
  General: 800,
  "Semi-Private": 1500,
  Private: 2500,
  Deluxe: 4000,
  ICU: 7500,
  Maternity: 3000,
};

// GET /api/admissions?status=active|discharged
router.get(
  "/",
  asyncHandler((req, res) => {
    const { search, status, ward } = req.query;
    let rows = table("admissions");
    rows = rows.filter((r) => matchesSearch(r, search, SEARCHABLE));
    if (status) rows = rows.filter((r) => r.status === status);
    if (ward) rows = rows.filter((r) => r.ward === ward);
    rows.sort((a, b) => String(b.admittedDate).localeCompare(String(a.admittedDate)));
    res.json({ count: rows.length, admissions: rows });
  })
);

// GET /api/admissions/:id
router.get(
  "/:id",
  asyncHandler((req, res) => {
    const admission = table("admissions").find((a) => a.id === req.params.id);
    if (!admission) throw new NotFoundError(`No admission with id ${req.params.id}`);
    const discharge = table("discharges").find((d) => d.admissionId === admission.id);
    const treatments = table("treatments").filter((t) => t.admissionId === admission.id);
    res.json({ admission, discharge: discharge ?? null, treatments });
  })
);

// POST /api/admissions  - admit a patient
router.post(
  "/",
  asyncHandler((req, res) => {
    const data = validate("admissions", req.body);

    // The patient must exist before they can be admitted.
    const patient = table("patients").find(
      (p) => p.id === data.patientId || p.name === data.patientId,
    );
    if (!patient) throw new NotFoundError(`No patient found for "${data.patientId}"`);

    if (data.bedType && !BED_TYPES.includes(data.bedType)) {
      return res.status(400).json({ error: `Bed type must be one of: ${BED_TYPES.join(", ")}` });
    }
    if (data.status && data.status !== "Active") {
      return res.status(400).json({ error: 'New admissions must have status "Active"' });
    }

    // A bed cannot host two patients at once.
    if (data.bedNo) {
      const clash = table("admissions").find(
        (a) => a.status === "Active" && a.bedNo === data.bedNo && a.ward === data.ward,
      );
      if (clash) {
        return res
          .status(409)
          .json({ error: `Bed ${data.bedNo} in ${data.ward} is already occupied by ${clash.patientName}.` });
      }
    }

    const record = {
      ...data,
      id: nextId("admission", "ADM"),
      patientId: patient.id,
      patientName: patient.name,
      ward: data.ward || "General Ward",
      dailyCharge: data.dailyCharge ?? DAILY_RATES[data.bedType] ?? 1000,
      admittedDate: data.admittedDate || new Date().toISOString().slice(0, 10),
      status: "Active",
      createdAt: new Date().toISOString(),
    };
    insert("admissions", record);
    res.status(201).json(record);
  })
);

// PUT /api/admissions/:id
router.put(
  "/:id",
  asyncHandler((req, res) => {
    const existing = table("admissions").find((a) => a.id === req.params.id);
    if (!existing) throw new NotFoundError(`No admission with id ${req.params.id}`);

    const data = { ...req.body };
    for (const k of Object.keys(data)) if (typeof data[k] === "string") data[k] = data[k].trim();
    if (data.dailyCharge !== undefined && data.dailyCharge !== "") data.dailyCharge = Number(data.dailyCharge);

    if (data.status && !["Active", "Discharged"].includes(data.status)) {
      return res.status(400).json({ error: 'Status must be "Active" or "Discharged"' });
    }

    res.json(update("admissions", req.params.id, data));
  })
);

// DELETE /api/admissions/:id
router.delete(
  "/:id",
  asyncHandler((req, res) => {
    if (table("discharges").some((d) => d.admissionId === req.params.id)) {
      return res
        .status(409)
        .json({ error: "This admission already has a discharge record and cannot be deleted." });
    }
    const admission = remove("admissions", req.params.id);
    if (!admission) throw new NotFoundError(`No admission with id ${req.params.id}`);
    res.json({ deleted: admission.id });
  })
);

export { DAILY_RATES };
export default router;
