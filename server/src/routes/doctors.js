import { Router } from "express";
import { table, insert, update, remove } from "../db.js";
import { validate, matchesSearch, NotFoundError, asyncHandler } from "../validate.js";

const router = Router();

const SEARCHABLE = ["id", "name", "specialization", "qualification", "phone"];

// GET /api/doctors?search=&specialization=
router.get(
  "/",
  asyncHandler((req, res) => {
    const { search, specialization } = req.query;
    let rows = table("doctors");
    rows = rows.filter((r) => matchesSearch(r, search, SEARCHABLE));
    if (specialization) rows = rows.filter((r) => r.specialization === specialization);
    rows.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ count: rows.length, doctors: rows });
  })
);

// GET /api/doctors/:id
router.get(
  "/:id",
  asyncHandler((req, res) => {
    const doctor = table("doctors").find((d) => d.id === req.params.id);
    if (!doctor) throw new NotFoundError(`No doctor with id ${req.params.id}`);
    const appointments = table("appointments").filter((a) => a.doctorId === doctor.id);
    res.json({ doctor, appointmentCount: appointments.length });
  })
);

// POST /api/doctors
router.post(
  "/",
  asyncHandler((req, res) => {
    const data = validate("doctors", req.body);
    const record = { ...data, id: data.id?.trim() || `DOC-${Date.now().toString(36).toUpperCase()}` };
    if (table("doctors").some((d) => d.id === record.id)) {
      return res.status(409).json({ error: `Doctor ${record.id} already exists` });
    }
    insert("doctors", record);
    res.status(201).json(record);
  })
);

// PUT /api/doctors/:id
router.put(
  "/:id",
  asyncHandler((req, res) => {
    const existing = table("doctors").find((d) => d.id === req.params.id);
    if (!existing) throw new NotFoundError(`No doctor with id ${req.params.id}`);
    const data = validate("doctors", req.body, { partial: true });
    res.json(update("doctors", req.params.id, data));
  })
);

// DELETE /api/doctors/:id
router.delete(
  "/:id",
  asyncHandler((req, res) => {
    const booked = table("appointments").filter(
      (a) => a.doctorId === req.params.id && a.status !== "Cancelled",
    ).length;
    if (booked && req.query.force !== "true") {
      return res
        .status(409)
        .json({ error: `Cannot delete a doctor with ${booked} active appointment(s). Use ?force=true to delete anyway.` });
    }
    const doctor = remove("doctors", req.params.id);
    if (!doctor) throw new NotFoundError(`No doctor with id ${req.params.id}`);
    res.json({ deleted: doctor.id });
  })
);

export default router;
