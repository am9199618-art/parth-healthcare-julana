import { Router } from "express";
import { table, insert, update, remove, nextId } from "../db.js";
import { validate, matchesSearch, NotFoundError, asyncHandler, isIsoDate } from "../validate.js";

const router = Router();

const SEARCHABLE = ["id", "patientId", "patientName", "doctorName", "reason", "date"];

// GET /api/appointments?status=&date=&doctorId=
router.get(
  "/",
  asyncHandler((req, res) => {
    const { search, status, date, doctorId } = req.query;
    let rows = table("appointments");
    rows = rows.filter((r) => matchesSearch(r, search, SEARCHABLE));
    if (status) rows = rows.filter((r) => r.status === status);
    if (date) rows = rows.filter((r) => r.date === date);
    if (doctorId) rows = rows.filter((r) => r.doctorId === doctorId);
    rows.sort((a, b) => `${a.date}${a.timeSlot}`.localeCompare(`${b.date}${b.timeSlot}`));
    res.json({ count: rows.length, appointments: rows });
  })
);

// GET /api/appointments/slots?doctorId=&date= - which slots are still free
router.get(
  "/slots",
  asyncHandler((req, res) => {
    const { doctorId, date } = req.query;
    const doctor = table("doctors").find((d) => d.id === doctorId);
    if (!doctor) throw new NotFoundError(`No doctor with id ${doctorId}`);

    const all = Array.isArray(doctor.slots) ? doctor.slots : [];
    const taken = new Set(
      table("appointments")
        .filter((a) => a.doctorId === doctorId && a.date === date && a.status !== "Cancelled")
        .map((a) => a.timeSlot),
    );
    res.json({ date: date ?? null, doctorId, slots: all.map((s) => ({ slot: s, booked: taken.has(s) })) });
  })
);

// GET /api/appointments/:id
router.get(
  "/:id",
  asyncHandler((req, res) => {
    const appointment = table("appointments").find((a) => a.id === req.params.id);
    if (!appointment) throw new NotFoundError(`No appointment with id ${req.params.id}`);
    res.json(appointment);
  })
);

// POST /api/appointments - book a doctor appointment
router.post(
  "/",
  asyncHandler((req, res) => {
    const data = validate("appointments", req.body);

    const doctor = table("doctors").find((d) => d.id === data.doctorId);
    if (!doctor) throw new NotFoundError(`No doctor with id ${data.doctorId}`);

    if (!isIsoDate(data.date)) {
      return res.status(400).json({ error: "Date must be YYYY-MM-DD" });
    }

    const status = data.status || "Pending";
    if (status !== "Cancelled") {
      const clash = table("appointments").find(
        (a) =>
          a.doctorId === data.doctorId &&
          a.date === data.date &&
          a.timeSlot === data.timeSlot &&
          a.status !== "Cancelled",
      );
      if (clash) {
        return res.status(409).json({
          error: `${doctor.name} already has a ${clash.timeSlot} appointment on ${data.date} (${clash.patientName}).`,
        });
      }
    }

    const patient = data.patientId
      ? table("patients").find((p) => p.id === data.patientId)
      : null;

    const record = {
      ...data,
      id: nextId("appointment", "APT"),
      patientId: patient?.id ?? data.patientId ?? null,
      doctorName: doctor.name,
      specialization: doctor.specialization,
      opdFee: data.opdFee ?? doctor.opdFee ?? 0,
      status,
      createdAt: new Date().toISOString(),
    };
    insert("appointments", record);
    res.status(201).json(record);
  })
);

// PUT /api/appointments/:id - used to confirm, complete or cancel
router.put(
  "/:id",
  asyncHandler((req, res) => {
    const existing = table("appointments").find((a) => a.id === req.params.id);
    if (!existing) throw new NotFoundError(`No appointment with id ${req.params.id}`);
    const data = validate("appointments", req.body, { partial: true });
    res.json(update("appointments", req.params.id, data));
  })
);

// DELETE /api/appointments/:id
router.delete(
  "/:id",
  asyncHandler((req, res) => {
    const appointment = remove("appointments", req.params.id);
    if (!appointment) throw new NotFoundError(`No appointment with id ${req.params.id}`);
    res.json({ deleted: appointment.id });
  })
);

export default router;
