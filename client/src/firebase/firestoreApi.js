/**
 * Firestore-backed data layer.
 *
 * Mirrors the exact interface of src/api/client.js (the Express backend) so
 * every page works unchanged against either backend. Swap with
 * VITE_DATA_BACKEND=api|firestore.
 *
 * The business rules enforced by the Express server (unique beds, no double
 * booking, discharge closes the admission, auto bill) are re-implemented here
 * so behaviour is identical whichever backend is active.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
} from "firebase/firestore";
import { db } from "./config.js";
import { ApiError } from "../api/client.js";
import {
  HOSPITAL_FALLBACK,
  BED_TYPES,
  BLOOD_GROUPS,
  GENDERS,
  DEPARTMENTS as DEPARTMENTS_LOCAL,
  TIME_SLOTS as TIME_SLOTS_LOCAL,
  TREATMENT_CATEGORIES as TREATMENT_CATEGORIES_LOCAL,
} from "../constants.js";

/* -------------------------------------------------------------------------- */
/*  Validation (mirrors server/src/validate.js)                                */
/* -------------------------------------------------------------------------- */

const GENDERS_OK = GENDERS;
const PAYMENT = ["Unpaid", "Partially Paid", "Paid"];
const APPT_STATUS = ["Pending", "Confirmed", "Completed", "Cancelled"];
const TREAT_STATUS = ["Planned", "In Progress", "Completed", "On Hold"];

const RULES = {
  patients: {
    name: (v) => (String(v ?? "").trim().length >= 2 ? null : "Patient name is required"),
    age: (v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 0 && n <= 130
        ? null
        : "Age must be a number between 0 and 130";
    },
    gender: (v) => (GENDERS_OK.includes(v) ? null : "Select a valid gender"),
    phone: (v) =>
      /^[0-9+\-\s()]{7,15}$/.test(String(v ?? "")) ? null : "Enter a valid phone number",
    email: (v) =>
      !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) ? null : "Enter a valid email",
  },
  doctors: {
    name: (v) => (String(v ?? "").trim().length >= 2 ? null : "Doctor name is required"),
    specialization: (v) => (String(v ?? "").trim() ? null : "Specialization is required"),
    phone: (v) =>
      /^[0-9+\-\s()]{7,15}$/.test(String(v ?? "")) ? null : "Enter a valid phone number",
  },
  admissions: {
    patientId: (v) => (String(v ?? "").trim() ? null : "Patient is required"),
    bedType: (v) => (String(v ?? "").trim() ? null : "Bed type is required"),
    reason: (v) => (String(v ?? "").trim() ? null : "Reason for admission is required"),
  },
  discharges: {
    finalDiagnosis: (v) => (String(v ?? "").trim() ? null : "Final diagnosis is required"),
    paymentStatus: (v) => (!v || PAYMENT.includes(v) ? null : "Invalid payment status"),
  },
  appointments: {
    patientName: (v) => (String(v ?? "").trim().length >= 2 ? null : "Patient name is required"),
    doctorId: (v) => (String(v ?? "").trim() ? null : "Doctor is required"),
    date: (v) => (isIsoDate(v) ? null : "Date must be YYYY-MM-DD"),
    timeSlot: (v) => (String(v ?? "").trim() ? null : "Time slot is required"),
    status: (v) => (!v || APPT_STATUS.includes(v) ? null : "Invalid appointment status"),
  },
  treatments: {
    patientId: (v) => (String(v ?? "").trim() ? null : "Patient is required"),
    treatmentName: (v) => (String(v ?? "").trim() ? null : "Treatment name is required"),
    status: (v) => (!v || TREAT_STATUS.includes(v) ? null : "Invalid treatment status"),
    progress: (v) =>
      v == null || v === "" || (Number(v) >= 0 && Number(v) <= 100)
        ? null
        : "Progress must be between 0 and 100",
  },
};

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function validate(collectionName, body, { partial = false } = {}) {
  const errors = {};
  const value = { ...body };

  for (const [field, rule] of Object.entries(RULES[collectionName] ?? {})) {
    if (value[field] === undefined) continue;
    if (partial && (value[field] === null || value[field] === "")) continue;
    const message = rule(value[field]);
    if (message) errors[field] = message;
  }
  if (Object.keys(errors).length) throw new ApiError(Object.values(errors)[0], 400, errors);

  for (const k of Object.keys(value)) if (typeof value[k] === "string") value[k] = value[k].trim();
  for (const k of ["age", "progress", "totalBill", "dailyCharge", "opdFee", "experience"]) {
    if (value[k] !== undefined && value[k] !== "" && value[k] !== null) value[k] = Number(value[k]);
  }
  return value;
}

const matches = (record, needle, fields) =>
  !needle ||
  fields.some((f) => {
    const v = record[f];
    if (v == null) return false;
    if (Array.isArray(v)) return v.join(" ").toLowerCase().includes(needle);
    return String(v).toLowerCase().includes(needle);
  });

const todayIso = () => new Date().toISOString().slice(0, 10);

function daysBetween(a, b) {
  const start = new Date(`${a}T00:00:00Z`).getTime();
  const end = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86400000);
}

const DAILY_RATES = {
  General: 800,
  "Semi-Private": 1500,
  Private: 2500,
  Deluxe: 4000,
  ICU: 7500,
  Maternity: 3000,
};

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                  */
/* -------------------------------------------------------------------------- */

async function all(name) {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function one(name, id) {
  const snap = await getDoc(doc(db, name, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Monotonic per-collection id (PAT-1001, ADM-5001, ...) via a counter doc. */
async function nextId(kind, prefix, base = 1000) {
  return runTransaction(db, async (tx) => {
    const ref = doc(db, "meta", "counters");
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : {};
    const n = (data[kind] ?? base) + 1;
    tx.set(ref, { ...data, [kind]: n }, { merge: true });
    return `${prefix}-${n}`;
  });
}

async function create(name, record) {
  await setDoc(doc(db, name, record.id), record);
  return record;
}

/* -------------------------------------------------------------------------- */
/*  Public API (same shape as the Express client)                             */
/* -------------------------------------------------------------------------- */

export const firestoreApi = {
  meta: async () => ({
    hospital: HOSPITAL_FALLBACK,
    bedTypes: BED_TYPES,
    bloodGroups: BLOOD_GROUPS,
    genders: GENDERS,
    specializations: DEPARTMENTS_LOCAL,
    timeSlots: TIME_SLOTS_LOCAL,
    treatmentCategories: TREATMENT_CATEGORIES_LOCAL,
  }),

  dashboard: async () => {
    const [patients, doctors, admissions, discharges, appointments, treatments] = await Promise.all([
      all("patients"),
      all("doctors"),
      all("admissions"),
      all("discharges"),
      all("appointments"),
      all("treatments"),
    ]);

    const today = todayIso();
    const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const activeAdmissions = admissions.filter((a) => a.status === "Active");
    const activeTreatments = treatments.filter(
      (t) => t.status === "In Progress" || t.status === "Planned",
    );

    const upcoming = appointments
      .filter((a) => a.date >= today && a.status !== "Cancelled")
      .sort((a, b) => `${a.date}${a.timeSlot}`.localeCompare(`${b.date}${b.timeSlot}`))
      .slice(0, 6);

    return {
      stats: {
        totalPatients: patients.length,
        admittedPatients: activeAdmissions.length,
        dischargedToday: discharges.filter((d) => d.dischargeDate === today).length,
        totalDischarges: discharges.length,
        doctors: doctors.length,
        appointmentsToday: appointments.filter((a) => a.date === today && a.status !== "Cancelled").length,
        appointmentsThisWeek: appointments.filter(
          (a) => a.date >= today && a.date <= weekAhead && a.status !== "Cancelled",
        ).length,
        pendingAppointments: appointments.filter((a) => a.status === "Pending").length,
        activeTreatments: activeTreatments.length,
        occupiedBeds: new Set(activeAdmissions.map((a) => `${a.ward}/${a.bedNo}`)).size,
        revenue: discharges.reduce(
          (sum, d) => sum + (d.paymentStatus === "Paid" ? Number(d.totalBill || 0) : 0),
          0,
        ),
        outstanding: discharges.reduce(
          (sum, d) => sum + (d.paymentStatus !== "Paid" ? Number(d.totalBill || 0) : 0),
          0,
        ),
      },
      upcomingAppointments: upcoming,
      activeAdmissions: activeAdmissions.slice(0, 6),
      activeTreatments: activeTreatments.slice(0, 6),
      recentPatients: [...patients]
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 5),
    };
  },

  /* ----------------------------- patients ------------------------------- */
  patients: {
    list: async ({ search, gender, bloodGroup } = {}) => {
      let rows = await all("patients");
      const needle = search ? String(search).toLowerCase() : null;
      rows = rows.filter((r) => matches(r, needle, ["id", "name", "phone", "email", "gender", "bloodGroup", "city", "medicalHistory"]));
      if (gender) rows = rows.filter((r) => r.gender === gender);
      if (bloodGroup) rows = rows.filter((r) => r.bloodGroup === bloodGroup);
      rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return { count: rows.length, patients: rows };
    },

    get: async (id) => {
      const patient = await one("patients", id);
      if (!patient) throw new ApiError(`No patient with id ${id}`, 404);

      const [admissions, discharges, treatments, appointments] = await Promise.all([
        query(collection(db, "admissions"), where("patientId", "==", id)),
        query(collection(db, "discharges"), where("patientId", "==", id)),
        query(collection(db, "treatments"), where("patientId", "==", id)),
        query(collection(db, "appointments"), where("patientId", "==", id)),
      ]);
      const unwrap = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      return {
        patient,
        admissions: unwrap(admissions),
        discharges: unwrap(discharges),
        treatments: unwrap(treatments),
        appointments: unwrap(appointments),
      };
    },

    create: async (body) => {
      const data = validate("patients", body);
      const id = await nextId("patient", "PAT");
      const record = {
        ...data,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await create("patients", record);
      return record;
    },

    update: async (id, body) => {
      const existing = await one("patients", id);
      if (!existing) throw new ApiError(`No patient with id ${id}`, 404);
      const data = validate("patients", body, { partial: true });
      const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, "patients", id), updated);
      return updated;
    },

    remove: async (id, force = false) => {
      const existing = await one("patients", id);
      if (!existing) throw new ApiError(`No patient with id ${id}`, 404);

      const admissions = await all("admissions");
      const mine = admissions.filter((a) => a.patientId === id);
      const appointments = await all("appointments");
      const pending = appointments.filter((a) => a.patientId === id && a.status === "Pending");

      const blockers = [];
      if (mine.length) blockers.push(`${mine.length} admission(s)`);
      if (pending.length) blockers.push(`${pending.length} pending appointment(s)`);

      if (blockers.length && !force) {
        throw new ApiError(
          `Cannot delete this patient while they still have ${blockers.join(" and ")}.`,
          409,
        );
      }

      if (force) {
        for (const a of mine) await deleteDoc(doc(db, "admissions", a.id));
      }
      await deleteDoc(doc(db, "patients", id));
      return { deleted: id };
    },
  },

  /* ------------------------------ doctors ------------------------------- */
  doctors: {
    list: async ({ search, specialization } = {}) => {
      let rows = await all("doctors");
      const needle = search ? String(search).toLowerCase() : null;
      rows = rows.filter((r) => matches(r, needle, ["id", "name", "specialization", "qualification", "phone"]));
      if (specialization) rows = rows.filter((r) => r.specialization === specialization);
      rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      return { count: rows.length, doctors: rows };
    },

    get: async (id) => {
      const doctor = await one("doctors", id);
      if (!doctor) throw new ApiError(`No doctor with id ${id}`, 404);
      return doctor;
    },

    create: async (body) => {
      const data = validate("doctors", body);
      const id = data.id?.trim() || `DOC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      if (await one("doctors", id)) throw new ApiError(`Doctor ${id} already exists`, 409);
      const record = {
        ...data,
        id,
        slots: Array.isArray(data.slots) ? data.slots : data.slots ? [data.slots] : [],
      };
      await create("doctors", record);
      return record;
    },

    update: async (id, body) => {
      const existing = await one("doctors", id);
      if (!existing) throw new ApiError(`No doctor with id ${id}`, 404);
      const data = validate("doctors", body, { partial: true });
      const updated = { ...existing, ...data, id };
      if (data.slots !== undefined) {
        updated.slots = Array.isArray(data.slots) ? data.slots : data.slots ? [data.slots] : [];
      }
      await setDoc(doc(db, "doctors", id), updated);
      return updated;
    },

    remove: async (id) => {
      const existing = await one("doctors", id);
      if (!existing) throw new ApiError(`No doctor with id ${id}`, 404);
      await deleteDoc(doc(db, "doctors", id));
      return { deleted: id };
    },
  },

  /* ----------------------------- admissions ----------------------------- */
  admissions: {
    list: async ({ search, status, ward } = {}) => {
      let rows = await all("admissions");
      const needle = search ? String(search).toLowerCase() : null;
      rows = rows.filter((r) => matches(r, needle, ["id", "patientId", "patientName", "ward", "bedNo", "reason", "status"]));
      if (status) rows = rows.filter((r) => r.status === status);
      if (ward) rows = rows.filter((r) => r.ward === ward);
      rows.sort((a, b) => String(b.admittedDate).localeCompare(String(a.admittedDate)));
      return { count: rows.length, admissions: rows };
    },

    get: async (id) => {
      const admission = await one("admissions", id);
      if (!admission) throw new ApiError(`No admission with id ${id}`, 404);
      const discharges = await all("discharges");
      const treatments = await all("treatments");
      return {
        admission,
        discharge: discharges.find((d) => d.admissionId === id) ?? null,
        treatments: treatments.filter((t) => t.admissionId === id),
      };
    },

    create: async (body) => {
      const data = validate("admissions", body);

      // Patient must already be registered.
      const patients = await all("patients");
      const patient =
        patients.find((p) => p.id === data.patientId) ||
        patients.find((p) => p.name === data.patientId);
      if (!patient) throw new ApiError(`No patient found for "${data.patientId}"`, 404);

      if (data.bedType && !BED_TYPES.includes(data.bedType)) {
        throw new ApiError(`Bed type must be one of: ${BED_TYPES.join(", ")}`, 400);
      }

      const ward = data.ward || "General Ward";

      // A bed cannot host two patients at once.
      if (data.bedNo) {
        const admissions = await all("admissions");
        const clash = admissions.find(
          (a) => a.status === "Active" && a.bedNo === data.bedNo && a.ward === ward,
        );
        if (clash) {
          throw new ApiError(
            `Bed ${data.bedNo} in ${ward} is already occupied by ${clash.patientName}.`,
            409,
          );
        }
      }

      const id = await nextId("admission", "ADM", 5000);
      const record = {
        ...data,
        id,
        patientId: patient.id,
        patientName: patient.name,
        ward,
        dailyCharge: data.dailyCharge ?? DAILY_RATES[data.bedType] ?? 1000,
        admittedDate: data.admittedDate || todayIso(),
        status: "Active",
        createdAt: new Date().toISOString(),
      };
      await create("admissions", record);
      return record;
    },

    update: async (id, body) => {
      const existing = await one("admissions", id);
      if (!existing) throw new ApiError(`No admission with id ${id}`, 404);
      if (body.status && !["Active", "Discharged"].includes(body.status)) {
        throw new ApiError('Status must be "Active" or "Discharged"', 400);
      }
      const updated = { ...existing, ...body, id };
      if (body.dailyCharge !== undefined && body.dailyCharge !== "") {
        updated.dailyCharge = Number(body.dailyCharge);
      }
      await setDoc(doc(db, "admissions", id), updated);
      return updated;
    },

    remove: async (id) => {
      const discharges = await all("discharges");
      if (discharges.some((d) => d.admissionId === id)) {
        throw new ApiError(
          "This admission already has a discharge record and cannot be deleted.",
          409,
        );
      }
      const existing = await one("admissions", id);
      if (!existing) throw new ApiError(`No admission with id ${id}`, 404);
      await deleteDoc(doc(db, "admissions", id));
      return { deleted: id };
    },
  },

  /* ----------------------------- discharges ----------------------------- */
  discharges: {
    list: async ({ search, paymentStatus } = {}) => {
      let rows = await all("discharges");
      const needle = search ? String(search).toLowerCase() : null;
      rows = rows.filter((r) => matches(r, needle, ["id", "admissionId", "patientId", "patientName", "finalDiagnosis", "conditionAtDischarge"]));
      if (paymentStatus) rows = rows.filter((r) => r.paymentStatus === paymentStatus);
      rows.sort((a, b) => String(b.dischargeDate).localeCompare(String(a.dischargeDate)));
      return { count: rows.length, discharges: rows };
    },

    get: async (id) => {
      const record = await one("discharges", id);
      if (!record) throw new ApiError(`No discharge record with id ${id}`, 404);
      return record;
    },

    create: async (body) => {
      const data = validate("discharges", body);
      const admission = await one("admissions", data.admissionId);
      if (!admission) throw new ApiError(`No admission with id ${data.admissionId}`, 404);

      const existing = (await all("discharges")).find((d) => d.admissionId === admission.id);
      if (existing) {
        throw new ApiError(
          `Admission ${admission.id} was already discharged on ${existing.dischargeDate} (record ${existing.id}).`,
          409,
        );
      }

      const dischargeDate = data.dischargeDate || todayIso();
      const totalDays = Math.max(1, daysBetween(admission.admittedDate, dischargeDate) + 1);
      const totalBill =
        data.totalBill === undefined || data.totalBill === null || data.totalBill === ""
          ? totalDays * (admission.dailyCharge || 1000)
          : Number(data.totalBill);

      const id = await nextId("discharge", "DIS", 7000);
      const record = {
        ...data,
        id,
        admissionId: admission.id,
        patientId: admission.patientId,
        patientName: admission.patientName,
        bedNo: admission.bedNo,
        ward: admission.ward,
        admittedDate: admission.admittedDate,
        dischargeDate,
        totalDays: data.totalDays ?? totalDays,
        totalBill,
        paymentStatus: data.paymentStatus || "Unpaid",
        createdAt: new Date().toISOString(),
      };
      await create("discharges", record);

      // Free the bed.
      await updateDoc(doc(db, "admissions", admission.id), {
        status: "Discharged",
        dischargeDate,
      });

      return record;
    },

    update: async (id, body) => {
      const existing = await one("discharges", id);
      if (!existing) throw new ApiError(`No discharge record with id ${id}`, 404);
      const data = validate("discharges", body, { partial: true });
      const updated = { ...existing, ...data, id };
      await setDoc(doc(db, "discharges", id), updated);
      return updated;
    },

    /** Void a discharge record and reopen the linked admission. */
    remove: async (id) => {
      const discharge = await one("discharges", id);
      if (!discharge) throw new ApiError(`No discharge record with id ${id}`, 404);
      await deleteDoc(doc(db, "discharges", id));

      const admission = await one("admissions", discharge.admissionId);
      if (admission && admission.status === "Discharged") {
        const { dischargeDate, ...rest } = admission;
        await setDoc(doc(db, "admissions", admission.id), { ...rest, status: "Active" });
      }
      return { deleted: id, admissionReopened: admission?.id ?? null };
    },
  },

  /* ---------------------------- appointments ---------------------------- */
  appointments: {
    list: async ({ search, status, date, doctorId } = {}) => {
      let rows = await all("appointments");
      const needle = search ? String(search).toLowerCase() : null;
      rows = rows.filter((r) => matches(r, needle, ["id", "patientId", "patientName", "doctorName", "reason", "date"]));
      if (status) rows = rows.filter((r) => r.status === status);
      if (date) rows = rows.filter((r) => r.date === date);
      if (doctorId) rows = rows.filter((r) => r.doctorId === doctorId);
      rows.sort((a, b) => `${a.date}${a.timeSlot}`.localeCompare(`${b.date}${b.timeSlot}`));
      return { count: rows.length, appointments: rows };
    },

    slots: async (doctorId, date) => {
      const doctor = await one("doctors", doctorId);
      if (!doctor) throw new ApiError(`No doctor with id ${doctorId}`, 404);
      const allSlots = Array.isArray(doctor.slots) ? doctor.slots : [];
      const taken = new Set(
        (await all("appointments"))
          .filter((a) => a.doctorId === doctorId && a.date === date && a.status !== "Cancelled")
          .map((a) => a.timeSlot),
      );
      return { date: date ?? null, doctorId, slots: allSlots.map((s) => ({ slot: s, booked: taken.has(s) })) };
    },

    get: async (id) => {
      const appointment = await one("appointments", id);
      if (!appointment) throw new ApiError(`No appointment with id ${id}`, 404);
      return appointment;
    },

    create: async (body) => {
      const data = validate("appointments", body);
      const doctor = await one("doctors", data.doctorId);
      if (!doctor) throw new ApiError(`No doctor with id ${data.doctorId}`, 404);
      if (!isIsoDate(data.date)) throw new ApiError("Date must be YYYY-MM-DD", 400);

      const status = data.status || "Pending";
      if (status !== "Cancelled") {
        const clash = (await all("appointments")).find(
          (a) =>
            a.doctorId === data.doctorId &&
            a.date === data.date &&
            a.timeSlot === data.timeSlot &&
            a.status !== "Cancelled",
        );
        if (clash) {
          throw new ApiError(
            `${doctor.name} already has a ${clash.timeSlot} appointment on ${data.date} (${clash.patientName}).`,
            409,
          );
        }
      }

      const patient = data.patientId ? await one("patients", data.patientId) : null;
      const id = await nextId("appointment", "APT", 8000);
      const record = {
        ...data,
        id,
        patientId: patient?.id ?? data.patientId ?? null,
        doctorName: doctor.name,
        specialization: doctor.specialization,
        opdFee: data.opdFee ?? doctor.opdFee ?? 0,
        status,
        createdAt: new Date().toISOString(),
      };
      await create("appointments", record);
      return record;
    },

    update: async (id, body) => {
      const existing = await one("appointments", id);
      if (!existing) throw new ApiError(`No appointment with id ${id}`, 404);
      const data = validate("appointments", body, { partial: true });
      const updated = { ...existing, ...data, id };
      await setDoc(doc(db, "appointments", id), updated);
      return updated;
    },

    remove: async (id) => {
      const existing = await one("appointments", id);
      if (!existing) throw new ApiError(`No appointment with id ${id}`, 404);
      await deleteDoc(doc(db, "appointments", id));
      return { deleted: id };
    },
  },

  /* ----------------------------- treatments ----------------------------- */
  treatments: {
    list: async ({ search, status, patientId, category } = {}) => {
      let rows = await all("treatments");
      const needle = search ? String(search).toLowerCase() : null;
      rows = rows.filter((r) => matches(r, needle, ["id", "patientId", "patientName", "treatmentName", "category", "doctorName", "status"]));
      if (status) rows = rows.filter((r) => r.status === status);
      if (patientId) rows = rows.filter((r) => r.patientId === patientId);
      if (category) rows = rows.filter((r) => r.category === category);
      rows.sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
      return { count: rows.length, treatments: rows };
    },

    get: async (id) => {
      const treatment = await one("treatments", id);
      if (!treatment) throw new ApiError(`No treatment with id ${id}`, 404);
      return treatment;
    },

    create: async (body) => {
      const data = validate("treatments", body);
      const patients = await all("patients");
      const patient =
        patients.find((p) => p.id === data.patientId) ||
        patients.find((p) => p.name === data.patientId);
      if (!patient) throw new ApiError(`No patient found for "${data.patientId}"`, 404);

      let doctorName = data.doctorName;
      if (data.doctorId) {
        const doctor = await one("doctors", data.doctorId);
        if (!doctor) throw new ApiError(`No doctor with id ${data.doctorId}`, 404);
        doctorName = doctor.name;
      }

      const id = await nextId("treatment", "TRT", 9000);
      const status = data.status || "Planned";
      const record = {
        ...data,
        id,
        patientId: patient.id,
        patientName: patient.name,
        doctorName: doctorName || null,
        status,
        progress: status === "Completed" ? 100 : (data.progress ?? 0),
        startDate: data.startDate || todayIso(),
        createdAt: new Date().toISOString(),
      };
      await create("treatments", record);
      return record;
    },

    update: async (id, body) => {
      const existing = await one("treatments", id);
      if (!existing) throw new ApiError(`No treatment with id ${id}`, 404);
      const data = validate("treatments", body, { partial: true });
      const updated = { ...existing, ...data, id };
      if (data.status === "Completed") updated.progress = 100;
      await setDoc(doc(db, "treatments", id), updated);
      return updated;
    },

    remove: async (id) => {
      const existing = await one("treatments", id);
      if (!existing) throw new ApiError(`No treatment with id ${id}`, 404);
      await deleteDoc(doc(db, "treatments", id));
      return { deleted: id };
    },
  },
};
