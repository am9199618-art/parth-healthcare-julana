import { Router } from "express";
import { table, insert, update, remove, nextId } from "../db.js";
import { validate, matchesSearch, NotFoundError, asyncHandler } from "../validate.js";

const router = Router();

const SEARCHABLE = ["id", "patientId", "patientName", "treatmentName", "category", "doctorName", "status"];

// GET /api/treatments?status=&patientId=
router.get(
  "/",
  asyncHandler((req, res) => {
    const { search, status, patientId, category } = req.query;
    let rows = table("treatments");
    rows = rows.filter((r) => matchesSearch(r, search, SEARCHABLE));
    if (status) rows = rows.filter((r) => r.status === status);
    if (patientId) rows = rows.filter((r) => r.patientId === patientId);
    if (category) rows = rows.filter((r) => r.category === category);
    rows.sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
    res.json({ count: rows.length, treatments: rows });
  })
);

// GET /api/treatments/:id
router.get(
  "/:id",
  asyncHandler((req, res) => {
    const treatment = table("treatments").find((t) => t.id === req.params.id);
    if (!treatment) throw new NotFoundError(`No treatment with id ${req.params.id}`);
    res.json(treatment);
  })
);

// POST /api/treatments - start a treatment / care plan
router.post(
  "/",
  asyncHandler((req, res) => {
    const data = validate("treatments", req.body);

    const patient = table("patients").find(
      (p) => p.id === data.patientId || p.name === data.patientId,
    );
    if (!patient) throw new NotFoundError(`No patient found for "${data.patientId}"`);

    let doctorName = data.doctorName;
    if (data.doctorId) {
      const doctor = table("doctors").find((d) => d.id === data.doctorId);
      if (!doctor) throw new NotFoundError(`No doctor with id ${data.doctorId}`);
      doctorName = doctor.name;
    }

    const record = {
      ...data,
      id: nextId("treatment", "TRT"),
      patientId: patient.id,
      patientName: patient.name,
      doctorName: doctorName || null,
      status: data.status || "Planned",
      progress: data.progress ?? 0,
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    // Completed work defaults to 100%.
    if (record.status === "Completed") record.progress = 100;

    insert("treatments", record);
    res.status(201).json(record);
  })
);

// PUT /api/treatments/:id
router.put(
  "/:id",
  asyncHandler((req, res) => {
    const existing = table("treatments").find((t) => t.id === req.params.id);
    if (!existing) throw new NotFoundError(`No treatment with id ${req.params.id}`);
    const data = validate("treatments", req.body, { partial: true });
    if (data.status === "Completed") data.progress = 100;
    res.json(update("treatments", req.params.id, data));
  })
);

// DELETE /api/treatments/:id
router.delete(
  "/:id",
  asyncHandler((req, res) => {
    const treatment = remove("treatments", req.params.id);
    if (!treatment) throw new NotFoundError(`No treatment with id ${req.params.id}`);
    res.json({ deleted: treatment.id });
  })
);

export default router;
