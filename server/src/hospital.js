export const HOSPITAL = {
  name: "Parth Life Care Hospital",
  tagline: "Compassionate care, right here in Julana",
  addressLine: "Main Hospital Road",
  city: "Julana",
  district: "Jind",
  state: "Haryana",
  pincode: "126111",
  phone: "9466317930",
  emergency: "9466317930",
  emergencyNote: "24x7 Emergency - Dr. Surrender",
  email: "care@parthhealthcare.in",
};

export const BED_TYPES = ["General", "Semi-Private", "Private", "Deluxe", "ICU", "Maternity"];
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const GENDERS = ["Male", "Female", "Other"];
export const PAYMENT_STATUSES = ["Unpaid", "Partially Paid", "Paid"];
export const APPOINTMENT_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];
export const TREATMENT_STATUSES = ["Planned", "In Progress", "Completed", "On Hold"];

/** Flat list of doctors and their OPD slots, used by the seeder and the frontend. */
export const SPECIALIZATIONS = [
  "General Medicine",
  "Cardiology",
  "Orthopaedics",
  "Gynaecology & Obstetrics",
  "Paediatrics",
  "Dermatology",
  "ENT",
  "Ophthalmology",
  "Neurology",
  "Dentistry",
  "Pulmonology",
  "Gastroenterology",
];
