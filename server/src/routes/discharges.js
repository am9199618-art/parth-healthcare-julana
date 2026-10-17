import { Router } from "express";
import { table, insert, update, remove, nextId } from "../db.js";
import { validate, matchesSearch, NotFoundError, asyncHandler } from "../validate.js";

const router = Router();

const SEARCHABLE = ["id", "admissionId", "patientId", "patientName", "finalDiagnosis", "condition"];

// GET /api/discharges?paymentStatus=
router.get(
  "/",
  asyncHandler((req, res) => {
    const { search, paymentStatus } = req.query;
    let rows = table("discharges");
    rows = rows.filter((r) => matchesSearch(r, search, SEARCHABLE));
    if (paymentStatus) rows = rows.filter((r) => r.paymentStatus === paymentStatus);
    rows.sort((a, b) => String(b.dischargeDate).localeCompare(String(a.dischargeDate)));
    res.json({ count: rows.length, discharges: rows });
  })
);

// GET /api/discharges/:id
router.get(
  "/:id",
  asyncHandler((req, res) => {
    const discharge = table("discharges").find((d) => d.id === req.params.id);
    if (!discharge) throw new NotFoundError(`No discharge record with id ${req.params.id}`);
    res.json(discharge);
  })
);

/**
 * POST /api/discharges - discharge a patient.
 * Also closes the matching admission, so the bed is freed automatically.
 */
router.post(
  "/",
  asyncHandler((req, res) => {
    const data = validate("discharges", req.body);

    const admission = table("admissions").find((a) => a.id === data.admissionId);
    if (!admission) throw new NotFoundError(`No admission with id ${data.admissionId}`);

    const already = table("discharges").find((d) => d.admissionId === admission.id);
    if (already) {
      return res.status(409).json({
        error: `Admission ${admission.id} was already discharged on ${already.dischargeDate} (record ${already.id}).`,
      });
    }

    const dischargeDate = data.dischargeDate || new Date().toISOString().slice(0, 10);

    // Bill defaults to stay length x daily rate when the front end omits it.
    let totalBill = data.totalBill;
    if (totalBill === undefined || totalBill === null || totalBill === "") {
      const start = new Date(`${admission.admittedDate}T00:00:00Z`);
      const end = new Date(`${dischargeDate}T00:00:00Z`);
      const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
      totalBill = days * (admission.dailyCharge || 1000);
    }

    const record = {
      ...data,
      id: nextId("discharge", "DIS"),
      admissionId: admission.id,
      patientId: admission.patientId,
      patientName: admission.patientName,
      bedNo: admission.bedNo,
      ward: admission.ward,
      admittedDate: admission.admittedDate,
      dischargeDate,
      totalDays:
        data.totalDays ??
        Math.max(
          1,
          Math.round(
            (new Date(`${dischargeDate}T00:00:00Z`) -
              new Date(`${admission.admittedDate}T00:00:00Z`)) /
              86400000,
          ) + 1,
        ),
      totalBill,
      paymentStatus: data.paymentStatus || "Unpaid",
      createdAt: new Date().toISOString(),
    };

    insert("discharges", record);
    // Free the bed.
    update("admissions", admission.id, { status: "Discharged", dischargeDate });

    res.status(201).json(record);
  })
);

// PUT /api/discharges/:id
router.put(
  "/:id",
  asyncHandler((req, res) => {
    const existing = table("discharges").find((d) => d.id === req.params.id);
    if (!existing) throw new NotFoundError(`No discharge record with id ${req.params.id}`);
    const data = validate("discharges", req.body, { partial: true });
    res.json(update("discharges", req.params.id, data));
  })
);

// DELETE /api/discharges/:id - void a discharge record.
// The linked admission is reopened as Active so the bed is not left stranded.
router.delete(
  "/:id",
  asyncHandler((req, res) => {
    const discharge = table("discharges").find((d) => d.id === req.params.id);
    if (!discharge) throw new NotFoundError(`No discharge record with id ${req.params.id}`);

    remove("discharges", req.params.id);

    const admission = table("admissions").find((a) => a.id === discharge.admissionId);
    if (admission && admission.status === "Discharged") {
      const { dischargeDate, ...rest } = admission;
      update("admissions", admission.id, { ...rest, status: "Active" });
    }

    res.json({ deleted: discharge.id, admissionReopened: admission?.id ?? null });
  })
);

export default router;
