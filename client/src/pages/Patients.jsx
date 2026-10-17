import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/index.js";
import { useApi } from "../api/useApi.js";
import { useToast } from "../context/ToastContext.jsx";
import FormModal from "../components/FormModal.jsx";
import {
  Button,
  Card,
  Input,
  Select,
  Table,
  Td,
  EmptyRow,
  Badge,
  PageHeader,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
} from "../components/ui.jsx";
import { formatDate, initials } from "../utils.js";
import { BLOOD_GROUPS, GENDERS } from "../constants.js";

const STATES = ["Haryana", "Rajasthan", "Delhi", "Uttar Pradesh", "Punjab", "Madhya Pradesh"];

const EMPTY = {
  name: "",
  age: "",
  gender: "",
  phone: "",
  email: "",
  bloodGroup: "",
  address: "",
  city: "Julana",
  district: "Jhajjar",
  state: "Haryana",
  pincode: "124507",
  emergencyContactName: "",
  emergencyContactPhone: "",
  allergies: "None",
  medicalHistory: "",
};

function patientFields() {
  return [
    { name: "name", label: "Full Name", required: true, placeholder: "e.g. Ram Lal" },
    { name: "age", label: "Age", type: "number", required: true, min: 0, max: 130, placeholder: "e.g. 42" },
    { name: "gender", label: "Gender", type: "select", required: true, options: GENDERS },
    { name: "bloodGroup", label: "Blood Group", type: "select", options: BLOOD_GROUPS, placeholder: "Unknown" },
    { name: "phone", label: "Phone", required: true, placeholder: "+91 98120 45678" },
    { name: "email", label: "Email", type: "email", placeholder: "patient@example.com" },
    { name: "address", label: "Address", placeholder: "House no., street" },
    { name: "city", label: "Village / City", placeholder: "Julana" },
    { name: "district", label: "District", placeholder: "Jhajjar" },
    { name: "state", label: "State", type: "select", options: STATES },
    { name: "pincode", label: "Pincode", placeholder: "124507" },
    { name: "emergencyContactName", label: "Emergency Contact", placeholder: "Relative name" },
    { name: "emergencyContactPhone", label: "Emergency Phone", placeholder: "+91 98120 00000" },
    { name: "allergies", label: "Known Allergies", placeholder: "None / Penicillin" },
    { name: "medicalHistory", label: "Medical History", type: "textarea", rows: 3, placeholder: "Ongoing conditions, past surgeries, current medication" },
  ];
}

export default function Patients() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [modal, setModal] = useState(null); // null | "new" | patient object
  const [busyId, setBusyId] = useState(null);

  const { data, loading, error, reload } = useApi(
    () => api.patients.list({ search, gender, bloodGroup }),
    [search, gender, bloodGroup],
  );

  const patients = data?.patients || [];

  const summary = useMemo(
    () => ({
      total: patients.length,
      male: patients.filter((p) => p.gender === "Male").length,
      female: patients.filter((p) => p.gender === "Female").length,
      children: patients.filter((p) => p.age < 18).length,
    }),
    [patients],
  );

  async function handleSubmit(values) {
    if (modal === "new") {
      await api.patients.create(values);
      toast.success(`Patient ${values.name} registered.`);
    } else {
      await api.patients.update(modal.id, values);
      toast.success(`Patient ${values.name} updated.`);
    }
    await reload({ quiet: true });
  }

  async function handleDelete(patient) {
    if (!window.confirm(`Delete the record for ${patient.name}?`)) return;
    setBusyId(patient.id);
    try {
      await api.patients.remove(patient.id);
      toast.success(`${patient.name} removed from the directory.`);
      await reload({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Patient Directory"
        subtitle="Register and manage every patient record of Parth Healthcare & Hospital"
        action={
          <Button onClick={() => setModal("new")}>
            <PlusIcon /> Register Patient
          </Button>
        }
      />

      {/* Search + filters */}
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            className="lg:col-span-2"
            placeholder="Search by name, UHID, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search patients"
          />
          <Select value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Filter by gender">
            <option value="">All genders</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
          <Select
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            aria-label="Filter by blood group"
          >
            <option value="">All blood groups</option>
            {BLOOD_GROUPS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <Badge tone="teal">{summary.total} shown</Badge>
          <Badge tone="blue">{summary.male} male</Badge>
          <Badge tone="blue">{summary.female} female</Badge>
          {summary.children > 0 ? <Badge tone="amber">{summary.children} under 18</Badge> : null}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading && !data ? (
          <LoadingBlock label="Loading patients" />
        ) : error && !data ? (
          <ErrorBlock error={error} onRetry={reload} />
        ) : patients.length === 0 ? (
          <EmptyState
            title="No patients found"
            description="Try a different search, or register a new patient."
            action={
              <Button size="sm" onClick={() => setModal("new")}>
                Register Patient
              </Button>
            }
          />
        ) : (
          <Table
            columns={[
              { key: "patient", header: "Patient" },
              { key: "uhid", header: "UHID" },
              { key: "age", header: "Age / Gender" },
              { key: "contact", header: "Contact" },
              { key: "blood", header: "Blood" },
              { key: "location", header: "Location" },
              { key: "registered", header: "Registered" },
              { key: "actions", header: "Actions", className: "text-right" },
            ]}
          >
            {patients.map((p) => (
              <tr key={p.id} className="transition hover:bg-slate-50">
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/patients/${p.id}`}
                        className="block truncate font-medium text-slate-800 hover:text-brand-700 hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.medicalHistory ? (
                        <p className="truncate text-xs text-slate-500">{p.medicalHistory}</p>
                      ) : null}
                    </div>
                  </div>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-slate-600">{p.id}</span>
                </Td>
                <Td>
                  <span className="whitespace-nowrap text-sm">
                    {p.age} yrs &middot; {p.gender}
                  </span>
                </Td>
                <Td>
                  <p className="whitespace-nowrap text-sm">{p.phone}</p>
                  {p.city ? <p className="text-xs text-slate-500">{p.city}</p> : null}
                </Td>
                <Td>
                  {p.bloodGroup ? <Badge tone="red">{p.bloodGroup}</Badge> : <span className="text-xs text-slate-400">-</span>}
                </Td>
                <Td>
                  <p className="text-sm">{p.city || "-"}</p>
                  <p className="text-xs text-slate-500">
                    {[p.district, p.state].filter(Boolean).join(", ")}
                  </p>
                </Td>
                <Td>
                  <span className="whitespace-nowrap text-xs text-slate-500">
                    {formatDate(p.createdAt)}
                  </span>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      to={`/patients/${p.id}`}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => setModal(p)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => handleDelete(p)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      {busyId === p.id ? "..." : "Delete"}
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
            {patients.length === 0 ? <EmptyRow colSpan={8} /> : null}
          </Table>
        )}
      </Card>

      <FormModal
        open={modal !== null}
        onClose={() => setModal(null)}
        onSubmit={handleSubmit}
        title={modal === "new" ? "Register New Patient" : `Edit ${modal?.name || "Patient"}`}
        subtitle={
          modal === "new"
            ? "Creates a unique UHID for the patient record"
            : `UHID ${modal?.id}`
        }
        submitLabel={modal === "new" ? "Register Patient" : "Save Changes"}
        fields={patientFields()}
        initial={modal === "new" ? EMPTY : { ...EMPTY, ...modal }}
      />
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 4a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V5a1 1 0 011-1z" />
    </svg>
  );
}
