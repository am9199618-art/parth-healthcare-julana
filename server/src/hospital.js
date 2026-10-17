export const HOSPITAL = {
  name: "Parth Healthcare & Hospital",
  tagline: "Compassionate care, right here in Julana",
  addressLine: "Main Hospital Road, Julana",
  city: "Julana",
  district: "Jhajjar",
  state: "Haryana",
  pincode: "124507",
  phone: "+91 98120 45678",
  emergency: "108",
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
