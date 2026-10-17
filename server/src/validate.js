/** Wrap an async route handler so rejected promises reach the error middleware. */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** 400 error with a list of field-level messages. */
export class ValidationError extends Error {
  constructor(errors) {
    const list = Object.values(errors).filter(Boolean);
    super(list.join(" ") || "Validation failed");
    this.status = 400;
    this.name = "ValidationError";
    this.fields = errors;
  }
}

/** 404 error. */
export class NotFoundError extends Error {
  constructor(message = "Record not found") {
    super(message);
    this.status = 404;
    this.name = "NotFoundError";
  }
}

const requiredFields = {
  patients: ["name", "age", "gender", "phone"],
  doctors: ["name", "specialization", "phone"],
  admissions: ["patientId", "bedType", "reason"],
  discharges: ["admissionId", "finalDiagnosis"],
  appointments: ["patientName", "doctorId", "date", "timeSlot"],
  treatments: ["patientId", "treatmentName"],
};

const fieldRules = {
  patients: {
    name: (v) => (String(v).trim().length >= 2 ? null : "Patient name is required"),
    age: (v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 0 && n <= 130
        ? null
        : "Age must be a number between 0 and 130";
    },
    gender: (v) => (["Male", "Female", "Other"].includes(v) ? null : "Select a valid gender"),
    phone: (v) =>
      /^[0-9+\-\s()]{7,15}$/.test(String(v)) ? null : "Enter a valid phone number",
    email: (v) =>
      !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) ? null : "Enter a valid email",
  },
  appointments: {
    patientName: (v) => (String(v).trim().length >= 2 ? null : "Patient name is required"),
    date: (v) => (isIsoDate(v) ? null : "Date must be YYYY-MM-DD"),
    timeSlot: (v) => (String(v).trim() ? null : "Time slot is required"),
    status: (v) =>
      !v || ["Pending", "Confirmed", "Completed", "Cancelled"].includes(v)
        ? null
        : "Invalid appointment status",
  },
  discharges: {
    finalDiagnosis: (v) => (String(v).trim() ? null : "Final diagnosis is required"),
    dischargeDate: (v) => (!v || isIsoDate(v) ? null : "Discharge date must be YYYY-MM-DD"),
    paymentStatus: (v) =>
      !v || ["Unpaid", "Partially Paid", "Paid"].includes(v)
        ? null
        : "Invalid payment status",
  },
  treatments: {
    treatmentName: (v) => (String(v).trim() ? null : "Treatment name is required"),
    status: (v) =>
      !v || ["Planned", "In Progress", "Completed", "On Hold"].includes(v)
        ? null
        : "Invalid treatment status",
    progress: (v) =>
      v == null || v === "" || (Number(v) >= 0 && Number(v) <= 100)
        ? null
        : "Progress must be between 0 and 100",
  },
};

export function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Validate and normalise a request body for one collection.
 * Throws ValidationError when anything is wrong.
 */
export function validate(collection, body, { partial = false } = {}) {
  const errors = {};
  const value = { ...body };

  for (const field of requiredFields[collection] ?? []) {
    if (value[field] === undefined || value[field] === null || value[field] === "") {
      if (!partial) errors[field] = `${humanise(field)} is required`;
    }
  }

  for (const [field, rules] of Object.entries(fieldRules[collection] ?? {})) {
    if (value[field] === undefined) continue;
    if (partial && (value[field] === null || value[field] === "")) continue;
    const message = rules(value[field]);
    if (message) errors[field] = message;
  }

  if (Object.keys(errors).length) throw new ValidationError(errors);

  // Normalise trims and numbers so the stored data stays clean.
  for (const key of Object.keys(value)) {
    if (typeof value[key] === "string") value[key] = value[key].trim();
  }
  for (const key of ["age", "progress", "totalBill", "dailyCharge", "opdFee"]) {
    if (value[key] !== undefined && value[key] !== "" && value[key] !== null) {
      value[key] = Number(value[key]);
    }
  }
  if (value.progress !== undefined) value.progress = value.progress ?? 0;

  return value;
}

function humanise(field) {
  return field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

/** Case-insensitive "contains" filter used across list endpoints. */
export function matchesSearch(record, query, fields) {
  if (!query) return true;
  const needle = String(query).toLowerCase();
  return fields.some((field) => {
    const v = record[field];
    if (v == null) return false;
    if (Array.isArray(v)) return v.join(" ").toLowerCase().includes(needle);
    return String(v).toLowerCase().includes(needle);
  });
}
