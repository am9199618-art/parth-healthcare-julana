/** Used until /api/meta responds, so the shell never renders empty. */
export const HOSPITAL_FALLBACK = {
  name: "Parth Healthcare & Hospital",
  addressLine: "Main Hospital Road, Julana",
  city: "Julana",
  district: "Jhajjar",
  state: "Haryana",
  pincode: "124507",
  phone: "+91 98120 45678",
  emergency: "108",
  email: "care@parthhealthcare.in",
};

/**
 * Single administrator account.
 *
 * Staff type "admin" as the username; the app maps it to the underlying
 * Firebase account. The email is not a secret (it is public in any Firebase
 * web app), but the password deliberately lives only in Firebase - never in
 * this file - so it cannot leak through the public GitHub repository.
 */
export const ADMIN_USERNAME = "admin";
export const ADMIN_EMAIL = "admin@parthhealthcare.in";

export const BED_TYPES = ["General", "Semi-Private", "Private", "Deluxe", "ICU", "Maternity"];

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const GENDERS = ["Male", "Female", "Other"];

export const WARDS = [
  "General Ward",
  "Semi-Private Ward",
  "Private Ward",
  "Deluxe Ward",
  "Maternity Ward",
  "Paediatric Ward",
  "ICU",
  "Emergency Ward",
];

export const DAILY_RATES = {
  General: 800,
  "Semi-Private": 1500,
  Private: 2500,
  Deluxe: 4000,
  ICU: 7500,
  Maternity: 3000,
};

export const BEDS_BY_WARD = {
  "General Ward": ["G-01", "G-02", "G-03", "G-04", "G-05", "G-06", "G-07", "G-08"],
  "Semi-Private Ward": ["SP-01", "SP-02", "SP-03", "SP-04", "SP-05"],
  "Private Ward": ["P-01", "P-02", "P-03", "P-04", "P-05", "P-06"],
  "Deluxe Ward": ["D-01", "D-02", "D-03"],
  "Maternity Ward": ["M-01", "M-02", "M-03", "M-04"],
  "Paediatric Ward": ["PD-01", "PD-02", "PD-03", "PD-04"],
  ICU: ["ICU-01", "ICU-02", "ICU-03", "ICU-04"],
  "Emergency Ward": ["ER-01", "ER-02", "ER-03"],
};

export const TREATMENT_CATEGORIES = [
  "Medication",
  "Surgery",
  "Therapy",
  "Diagnostics",
  "Emergency Care",
  "Rehabilitation",
];

export const TIME_SLOTS = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "01:00 PM", "04:00 PM", "04:30 PM", "05:00 PM",
  "05:30 PM", "06:00 PM", "06:30 PM",
];

export const SERVICES = [
  { name: "Emergency Care", description: "Round-the-clock accident and trauma support with ambulance service.", icon: "🚑" },
  { name: "Indoor Admission", description: "General, private, maternity, paediatric and ICU beds with nursing care.", icon: "🛏️" },
  { name: "Doctor Appointments", description: "Book OPD slots online across every department, no long queues.", icon: "🗓️" },
  { name: "Diagnostics", description: "Blood work, ECG, X-ray, ultrasound and pathology reported same day.", icon: "🧪" },
  { name: "Maternity Care", description: "Antenatal checks, normal and caesarean delivery, postnatal follow-up.", icon: "👶" },
  { name: "Pharmacy", description: "In-house pharmacy with genuine medicines at subsidised rates.", icon: "💊" },
  { name: "Physiotherapy", description: "Recovery support for fracture, stroke, joint pain and sports injuries.", icon: "🦴" },
  { name: "Health Check-ups", description: "Affordable full-body screening packages for every age group.", icon: "❤️" },
];

export const DEPARTMENTS = [
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
