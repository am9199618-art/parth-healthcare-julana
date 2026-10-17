import { useState } from "react";
import { api } from "../api/index.js";
import { useApi } from "../api/useApi.js";
import { useToast } from "../context/ToastContext.jsx";
import FormModal from "../components/FormModal.jsx";
import {
  Button,
  Card,
  Input,
  Select,
  Badge,
  PageHeader,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
} from "../components/ui.jsx";
import { initials } from "../utils.js";
import { DEPARTMENTS, TIME_SLOTS } from "../constants.js";

export default function Doctors() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [modal, setModal] = useState(null); // null | "new" | doctor

  const { data, loading, error, reload } = useApi(
    () => api.doctors.list({ search, specialization }),
    [search, specialization],
  );

  const doctors = data?.doctors || [];

  async function handleSubmit(values) {
    if (modal === "new") {
      const created = await api.doctors.create(values);
      toast.success(`${created.name} added to the medical team.`);
    } else {
      await api.doctors.update(modal.id, values);
      toast.success(`${values.name} updated.`);
    }
    setModal(null);
    await reload({ quiet: true });
  }

  async function remove(doctor) {
    if (!window.confirm(`Remove ${doctor.name} from the doctor list?`)) return;
    try {
      await api.doctors.remove(doctor.id);
      toast.success(`${doctor.name} removed.`);
      await reload({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Doctors"
        subtitle="Medical team, departments and OPD schedules"
        action={<Button onClick={() => setModal("new")}>+ Add Doctor</Button>}
      />

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            className="sm:col-span-2"
            placeholder="Search by name, specialization or qualification..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search doctors"
          />
          <Select
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            aria-label="Filter by department"
          >
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-3">
          <Badge tone="teal">{doctors.length} doctor(s) on duty</Badge>
        </div>
      </Card>

      {loading && !data ? (
        <LoadingBlock label="Loading doctors" />
      ) : error && !data ? (
        <ErrorBlock error={error} onRetry={reload} />
      ) : doctors.length === 0 ? (
        <Card>
          <EmptyState title="No doctors found" description="Adjust the filters or add a new doctor." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {doctors.map((d) => (
            <Card key={d.id} className="flex flex-col">
              <div className="flex items-start gap-3 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {initials(d.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">{d.name}</p>
                  <p className="truncate text-sm text-brand-700">{d.specialization}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{d.qualification}</p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 px-5 py-4 text-xs">
                <div>
                  <dt className="text-slate-500">OPD Days</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{d.opdDays || "-"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">OPD Timing</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{d.opdTime || "-"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Consultation Fee</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {d.opdFee ? `₹${d.opdFee}` : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Room</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{d.roomNo || "-"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Experience</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {d.experience ? `${d.experience} years` : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Contact</dt>
                  <dd className="mt-0.5 truncate font-medium text-slate-800">{d.phone}</dd>
                </div>
              </dl>

              <div className="mt-auto flex items-center gap-2 border-t border-slate-100 px-5 py-3">
                <span className="flex-1 truncate text-xs text-slate-400">{d.email || d.id}</span>
                <button
                  type="button"
                  onClick={() => setModal(d)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(d)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <FormModal
        open={modal !== null}
        onClose={() => setModal(null)}
        onSubmit={handleSubmit}
        title={modal === "new" ? "Add Doctor" : `Edit ${modal?.name || "Doctor"}`}
        subtitle={modal === "new" ? "Add a doctor to the medical team" : modal?.id}
        submitLabel={modal === "new" ? "Add Doctor" : "Save Changes"}
        fields={[
          { name: "name", label: "Doctor Name", required: true, placeholder: "e.g. Dr. Anil Kumar" },
          {
            name: "specialization",
            label: "Department",
            type: "select",
            required: true,
            options: DEPARTMENTS,
            span: "full",
          },
          { name: "qualification", label: "Qualification", placeholder: "e.g. MBBS, MD" },
          { name: "phone", label: "Phone", required: true, placeholder: "+91 98120 10001" },
          { name: "email", label: "Email", type: "email", placeholder: "name@parthhealthcare.in" },
          { name: "roomNo", label: "Room / Cabin", placeholder: "e.g. Room 101" },
          { name: "opdDays", label: "OPD Days", placeholder: "e.g. Mon - Sat" },
          { name: "opdTime", label: "OPD Timing", placeholder: "e.g. 09:00 AM - 01:00 PM" },
          { name: "opdFee", label: "Consultation Fee (₹)", type: "number", min: 0 },
          { name: "experience", label: "Experience (years)", type: "number", min: 0, max: 60 },
          {
            name: "slots",
            label: "Bookable OPD Slots",
            type: "select",
            span: "full",
            options: TIME_SLOTS,
            hint: "Select one time slot for this doctor. Slots drive the booking calendar.",
          },
        ]}
        initial={
          modal === "new"
            ? {
                name: "",
                specialization: "",
                qualification: "",
                phone: "",
                email: "",
                roomNo: "",
                opdDays: "Mon - Sat",
                opdTime: "09:00 AM - 01:00 PM",
                opdFee: 300,
                experience: 0,
                slots: TIME_SLOTS[0],
              }
            : modal
              ? // The form edits a single slot; `slots` is stored as an array.
                { ...modal, slots: Array.isArray(modal.slots) ? modal.slots[0] ?? "" : "" }
              : {}
        }
      />
    </div>
  );
}
