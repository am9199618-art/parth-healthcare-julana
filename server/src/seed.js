/**
 * Seeds the JSON database with realistic demo records for
 * Parth Healthcare & Hospital, Julana.
 *
 *   npm run seed     -> fill an empty database
 *   npm run reset    -> wipe and refill
 */
import { replaceAll, load, isEmpty } from "./db.js";

const force = process.argv.includes("--force");

if (!isEmpty() && !force) {
  console.log("Database already has data. Use `npm run reset` to wipe and reseed.");
  process.exit(0);
}

/** Deterministic pseudo-random so reseeding gives the same demo set. */
let seed = 20261016;
function rnd() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
const stamp = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();

const DOCTORS = [
  { id: "DOC-001", name: "Dr. Anil Kumar", specialization: "General Medicine", qualification: "MBBS, MD (General Medicine)", phone: "+91 98120 10001", email: "anil.kumar@parthhealthcare.in", opdDays: "Mon - Sat", opdTime: "09:00 AM - 01:00 PM", opdFee: 300, roomNo: "Room 101", experience: 18, slots: ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM"] },
  { id: "DOC-002", name: "Dr. Priya Sharma", specialization: "Gynaecology & Obstetrics", qualification: "MBBS, MS (OBG)", phone: "+91 98120 10002", email: "priya.sharma@parthhealthcare.in", opdDays: "Mon - Sat", opdTime: "10:00 AM - 02:00 PM", opdFee: 500, roomNo: "Room 205", experience: 12, slots: ["10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM"] },
  { id: "DOC-003", name: "Dr. Rajesh Verma", specialization: "Orthopaedics", qualification: "MBBS, MS (Ortho)", phone: "+91 98120 10003", email: "rajesh.verma@parthhealthcare.in", opdDays: "Tue, Thu, Sat", opdTime: "04:00 PM - 07:00 PM", opdFee: 600, roomNo: "Room 112", experience: 15, slots: ["04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM"] },
  { id: "DOC-004", name: "Dr. Sunita Devi", specialization: "Paediatrics", qualification: "MBBS, DCH", phone: "+91 98120 10004", email: "sunita.devi@parthhealthcare.in", opdDays: "Mon - Sat", opdTime: "09:00 AM - 12:00 PM", opdFee: 350, roomNo: "Room 104", experience: 9, slots: ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM"] },
  { id: "DOC-005", name: "Dr. Mohit Goyal", specialization: "Cardiology", qualification: "MBBS, MD, DM (Cardiology)", phone: "+91 98120 10005", email: "mohit.goyal@parthhealthcare.in", opdDays: "Wed, Sat", opdTime: "11:00 AM - 02:00 PM", opdFee: 800, roomNo: "Room 301", experience: 21, slots: ["11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM"] },
  { id: "DOC-006", name: "Dr. Kavita Rani", specialization: "Dermatology", qualification: "MBBS, MD (DVL)", phone: "+91 98120 10006", email: "kavita.rani@parthhealthcare.in", opdDays: "Mon - Fri", opdTime: "04:00 PM - 06:00 PM", opdFee: 400, roomNo: "Room 107", experience: 7, slots: ["04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM"] },
  { id: "DOC-007", name: "Dr. Sandeep Yadav", specialization: "ENT", qualification: "MBBS, MS (ENT)", phone: "+91 98120 10007", email: "sandeep.yadav@parthhealthcare.in", opdDays: "Mon - Sat", opdTime: "09:00 AM - 11:00 AM", opdFee: 450, roomNo: "Room 110", experience: 11, slots: ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM"] },
  { id: "DOC-008", name: "Dr. Neha Aggarwal", specialization: "Dentistry", qualification: "BDS, MDS", phone: "+91 98120 10008", email: "neha.agarwal@parthhealthcare.in", opdDays: "Mon - Sat", opdTime: "10:00 AM - 06:00 PM", opdFee: 300, roomNo: "Dental Wing", experience: 8, slots: ["10:00 AM", "11:00 AM", "12:00 PM", "04:00 PM", "05:00 PM"] },
];

const NAMES = [
  "Ram Lal", "Sunita Devi", "Mahesh Chand", "Kavita Rani", "Rohit Sharma", "Anita Singh",
  "Vikram Singh", "Pooja Devi", "Suresh Kumar", "Meena Kumari", "Ajay Pal", "Rekha Devi",
  "Deepak Yadav", "Nisha Rani", "Ramesh Chand", "Seema Devi", "Manoj Kumar", "Krishna Devi",
  "Sanjay Kumar", "Babita Devi", "Rakesh Roat", "Priyanka Rani", "Dinesh Kumar", "Sita Devi",
  "Mukesh Kumar", "Anjali Devi", "Rampal Kataria", "Laxmi Devi", "Surender Singh", "Kamal Kumari",
];

const VILLAGES = ["Julana", "Kharawar", "Madanpura", "Bassan", "Gohana", "Jhajjar", "Badli", "Titoli", "Mehram", "Khudan", "Bhuna", "Jatusana"];
const STREETS = ["Main Bazaar", "Hospital Road", "Civil Lines", "Model Town", "Nehru Nagar", "Station Road", "Gandhi Chowk", "Patel Colony"];
const STATES = ["Haryana", "Haryana", "Haryana", "Rajasthan", "Delhi", "Uttar Pradesh"];
const BLOOD = ["A+", "B+", "O+", "AB+", "A-", "O-", "B-", "AB-"];
const CONDITIONS = [
  "Acute Gastroenteritis", "Type 2 Diabetes Mellitus", "Hypertension", "Acute Bronchitis",
  "Fracture - Left Tibia", "Anaemia", "Acute Appendicitis", "Migraine", "Pneumonia",
  "Dengue Fever", "Lower Back Pain", "URTI", "Cellulitis", "Renal Stone", "Normal Delivery",
];
const ALLERGIES = ["None", "None", "None", "Penicillin", "Sulfa drugs", "NSAIDs", "Iodine contrast"];
const WARDS = ["General Ward", "Private Ward", "Maternity Ward", "ICU", "Paediatric Ward", "Semi-Private Ward"];
const BEDS = {
  "General Ward": ["G-01", "G-02", "G-03", "G-04", "G-05", "G-06"],
  "Semi-Private Ward": ["SP-01", "SP-02", "SP-03", "SP-04"],
  "Private Ward": ["P-01", "P-02", "P-03", "P-04", "P-05"],
  "Maternity Ward": ["M-01", "M-02", "M-03"],
  "ICU": ["ICU-01", "ICU-02", "ICU-03"],
  "Paediatric Ward": ["PD-01", "PD-02", "PD-03"],
};
const RATES = { General: 800, "Semi-Private": 1500, Private: 2500, Deluxe: 4000, ICU: 7500, Maternity: 3000 };

const TREATMENT_PLAN = {
  "Acute Gastroenteritis": ["IV Fluids", "Anti-emetics", "Oral Rehydration Therapy"],
  "Type 2 Diabetes Mellitus": ["Insulin Therapy", "Diet Counselling", "Glycemic Monitoring"],
  Hypertension: ["Antihypertensive Therapy", "BP Monitoring", "Salt Restriction Counselling"],
  "Acute Bronchitis": ["Nebulisation", "Chest Physiotherapy", "Antibiotic Course"],
  "Fracture - Left Tibia": ["Orthopaedic Surgery", "Plaster Application", "Physiotherapy"],
  Anaemia: ["Iron Therapy", "Diet Supplementation", "Haemoglobin Monitoring"],
  "Acute Appendicitis": ["Appendicectomy", "Post-op Monitoring", "Antibiotic Therapy"],
  Migraine: ["Pain Management", "Antiemetic Therapy", "Neurology Consultation"],
  Pneumonia: ["IV Antibiotics", "Oxygen Support", "Chest X-Ray Monitoring"],
  "Dengue Fever": ["Fluid Management", "Platelet Monitoring", "Antipyretics"],
  "Lower Back Pain": ["Physiotherapy", "Pain Management", "Posture Correction"],
  URTI: ["Symptomatic Treatment", "Steam Inhalation", "Antihistamines"],
  Cellulitis: ["IV Antibiotics", "Wound Care", "Elevation Therapy"],
  "Renal Stone": ["Lithotripsy", "Hydration Therapy", "Stone Analysis"],
  "Normal Delivery": ["Antenatal Care", "Labour Monitoring", "Postnatal Care"],
};

// ---------------------------------------------------------------- build

const patients = [];
let patientCounter = 1000;

for (let i = 0; i < 28; i += 1) {
  patientCounter += 1;
  const name = NAMES[i % NAMES.length];
  const gender = rnd() > 0.5 ? "Male" : "Female";
  const age = between(1, 82);
  patients.push({
    id: `PAT-${patientCounter}`,
    name,
    age,
    gender,
    phone: `+91 ${between(70, 99)}${between(100, 999)} ${between(10000, 99999)}`,
    email: `${name.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`,
    bloodGroup: pick(BLOOD),
    address: `${between(1, 300)}, ${pick(STREETS)}`,
    city: pick(VILLAGES),
    district: "Jhajjar",
    state: pick(STATES),
    pincode: "124507",
    emergencyContactName: pick(NAMES),
    emergencyContactPhone: `+91 ${between(70, 99)}${between(100, 999)} ${between(10000, 99999)}`,
    allergies: pick(ALLERGIES),
    medicalHistory: pick(CONDITIONS),
    createdAt: stamp(between(1, 120)),
    updatedAt: stamp(between(0, 30)),
  });
}

const admissions = [];
const discharges = [];
const treatments = [];
const appointments = [];

let admissionCounter = 5000;
let dischargeCounter = 7000;
let appointmentCounter = 8000;
let treatmentCounter = 9000;

// Past stays -> discharged
for (let i = 0; i < 16; i += 1) {
  const patient = pick(patients);
  const condition = pick(CONDITIONS);
  const bedType = pick(["General", "Semi-Private", "Private", "Maternity"]);
  const ward = pick(WARDS);
  const admittedDaysAgo = between(20, 90);
  const length = between(2, 8);
  const dischargedDaysAgo = Math.max(0, admittedDaysAgo - length);
  const dailyCharge = RATES[bedType];
  const totalBill = length * dailyCharge;

  admissionCounter += 1;
  const admissionId = `ADM-${admissionCounter}`;
  admissions.push({
    id: admissionId,
    patientId: patient.id,
    patientName: patient.name,
    ward,
    bedNo: pick(BEDS[ward] ?? ["G-01"]),
    bedType,
    admittedDate: iso(admittedDaysAgo),
    expectedDischarge: iso(dischargedDaysAgo),
    reason: condition,
    admittedBy: pick(["Dr. Anil Kumar", "Dr. Priya Sharma", "Dr. Sunita Devi", "Emergency Dept."]),
    dailyCharge,
    status: "Discharged",
    dischargeDate: iso(dischargedDaysAgo),
    createdAt: stamp(admittedDaysAgo),
  });

  dischargeCounter += 1;
  discharges.push({
    id: `DIS-${dischargeCounter}`,
    admissionId,
    patientId: patient.id,
    patientName: patient.name,
    ward,
    bedNo: admissions[admissions.length - 1].bedNo,
    admittedDate: iso(admittedDaysAgo),
    dischargeDate: iso(dischargedDaysAgo),
    totalDays: length,
    conditionAtDischarge: pick(["Stable", "Recovered", "Improved", "Stable"]),
    finalDiagnosis: condition,
    treatmentSummary: `${condition} treated with ${pick(TREATMENT_PLAN[condition] ?? ["Medication"])}. Recovering well.`,
    medicines: `Tab. ${pick(["Azithromycin", "Metformin", "Amlodipine", "Paracetamol", "Pantoprazole"])} ${between(2, 5)} days, as advised.`,
    advice: "Rest, plenty of fluids, review after 7 days. Report immediately if fever returns.",
    followUpDate: iso(dischargedDaysAgo - 7),
    totalBill,
    paymentStatus: rnd() > 0.35 ? "Paid" : pick(["Unpaid", "Partially Paid"]),
    createdAt: stamp(dischargedDaysAgo),
  });
}

// Current inpatients -> active admissions
for (let i = 0; i < 9; i += 1) {
  const patient = pick(patients);
  const condition = pick(CONDITIONS);
  const bedType = pick(["General", "General", "Private", "ICU", "Semi-Private"]);
  const ward = bedType === "ICU" ? "ICU" : pick(["General Ward", "Private Ward", "Semi-Private Ward", "Paediatric Ward"]);
  const admittedDaysAgo = between(0, 6);

  admissionCounter += 1;
  const admissionId = `ADM-${admissionCounter}`;
  const dailyCharge = RATES[bedType];

  admissions.push({
    id: admissionId,
    patientId: patient.id,
    patientName: patient.name,
    ward,
    bedNo: pick(BEDS[ward] ?? ["G-01"]),
    bedType,
    admittedDate: iso(admittedDaysAgo),
    expectedDischarge: iso(Math.max(0, admittedDaysAgo - between(2, 5))),
    reason: condition,
    admittedBy: pick(["Dr. Anil Kumar", "Dr. Mohit Goyal", "Dr. Rajesh Verma", "Emergency Dept."]),
    dailyCharge,
    status: "Active",
    createdAt: stamp(admittedDaysAgo),
  });

  // Each inpatient has an active treatment plan.
  const plan = TREATMENT_PLAN[condition] ?? ["Observation", "Medication"];
  plan.forEach((step, index) => {
    treatmentCounter += 1;
    const done = index < plan.length - 1;
    treatments.push({
      id: `TRT-${treatmentCounter}`,
      patientId: patient.id,
      patientName: patient.name,
      admissionId,
      doctorId: pick(DOCTORS).id,
      doctorName: pick(DOCTORS).name,
      treatmentName: step,
      category: step.includes("Surgery") ? "Surgery" : step.includes("Therapy") ? "Therapy" : step.includes("Monitoring") || step.includes("X-Ray") ? "Diagnostics" : "Medication",
      startDate: iso(admittedDaysAgo),
      endDate: done ? iso(Math.max(0, admittedDaysAgo - 1)) : "",
      status: done ? "Completed" : "In Progress",
      progress: done ? 100 : between(30, 70),
      notes: `Day ${index + 1} of care plan for ${condition}.`,
      createdAt: stamp(admittedDaysAgo),
    });
  });
}

// Appointment book: past (completed) and upcoming
for (let i = 0; i < 24; i += 1) {
  const patient = pick(patients);
  const doctor = pick(DOCTORS);
  const isPast = i % 3 !== 0;
  // iso() takes a count of days *ago*, so past visits need a positive count
  // and upcoming visits need a negative one.
  const daysAgo = isPast ? between(1, 25) : -between(0, 12);
  appointmentCounter += 1;
  appointments.push({
    id: `APT-${appointmentCounter}`,
    patientId: patient.id,
    patientName: patient.name,
    phone: patient.phone,
    doctorId: doctor.id,
    doctorName: doctor.name,
    specialization: doctor.specialization,
    date: iso(daysAgo),
    timeSlot: pick(doctor.slots),
    reason: pick(["Fever and cough", "Follow-up check", "Body pain", "Diabetes review", "BP check", "Skin rash", "Knee pain", "Antenatal check-up", "Headache", "Toothache"]),
    opdFee: doctor.opdFee,
    status: isPast ? pick(["Completed", "Completed", "Cancelled"]) : pick(["Pending", "Pending", "Confirmed"]),
    notes: isPast ? "Consultation done." : "",
    createdAt: stamp(Math.abs(daysAgo) + 1),
  });
}

// Outpatient treatments with no admission
for (let i = 0; i < 8; i += 1) {
  const patient = pick(patients);
  const doctor = pick(DOCTORS);
  treatmentCounter += 1;
  const daysAgo = between(0, 40);
  treatments.push({
    id: `TRT-${treatmentCounter}`,
    patientId: patient.id,
    patientName: patient.name,
    admissionId: null,
    doctorId: doctor.id,
    doctorName: doctor.name,
    treatmentName: pick(["Physiotherapy Session", "Minor Procedure", "Diagnostic Screening", "Counselling Session", "Wound Dressing"]),
    category: pick(["Therapy", "Diagnostics", "Medication", "Rehabilitation"]),
    startDate: iso(daysAgo),
    endDate: "",
    status: pick(["In Progress", "Planned", "On Hold"]),
    progress: between(0, 85),
    notes: "Outpatient care plan.",
    createdAt: stamp(daysAgo),
  });
}

replaceAll({
  patients,
  doctors: DOCTORS,
  admissions,
  discharges,
  appointments,
  treatments,
  counters: {
    patient: patientCounter,
    admission: admissionCounter,
    discharge: dischargeCounter,
    appointment: appointmentCounter,
    treatment: treatmentCounter,
  },
});

const db = load();
console.log(`Seeded Parth Healthcare & Hospital database:
  patients      ${db.patients.length}
  doctors       ${db.doctors.length}
  admissions    ${db.admissions.length}  (${db.admissions.filter((a) => a.status === "Active").length} active)
  discharges    ${db.discharges.length}
  appointments  ${db.appointments.length}
  treatments    ${db.treatments.length}
`);
