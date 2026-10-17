import { useState } from "react";
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
  Badge,
  StatusBadge,
  ProgressBar,
  PageHeader,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
} from "../components/ui.jsx";
import { formatDate, today } from "../utils.js";
import { TREATMENT_CATEGORIES } from "../constants.js";

const STATUSES = ["Planned", "In Progress", "Completed", "On Hold"];

export default function Treatments() {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);

  const { data, loading, error, reload } = useApi(
    () => api.treatments.list({ status, search }),
    [status, search],
  );

  const { data: doctorsData } = useApi(() => api.doctors.list(), []);
  const { data: admissionsData } = useApi(() => api.admissions.list({ status: "Active" }), []);

  const treatments = data?.treatments || [];
  const doctors = doctorsData?.doctors || [];
  const activeAdmissions = admissionsData?.admissions || [];

  const summary = {
    inProgress: treatments.filter((t) => t.status === "In Progress").length,
    completed: treatments.filter((t) => t.status === "Completed").length,
    avgProgress: treatments.length
      ? Math.round(treatments.reduce((sum, t) => sum + Number(t.progress || 0), 0) / treatments.length)
      : 0,
  };

  async function setTreatmentStatus(treatment, next) {
    try {
      await api.treatments.update(treatment.id, { status: next });
      toast.success(`${treatment.treatmentName} marked ${next.toLowerCase()}.`);
      await reload({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function bumpProgress(treatment) {
    const next = Math.min(100, Number(treatment.progress || 0) + 25);
    try {
      await api.treatments.update(treatment.id, { progress: next });
      toast.success(`Progress updated to ${next}%.`);
      await reload({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove(treatment) {
    if (!window.confirm(`Delete treatment "${treatment.treatmentName}"?`)) return;
    try {
      await api.treatments.remove(treatment.id);
      toast.success("Treatment removed.");
      await reload({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Treatments & Care Plans"
        subtitle="Plan, schedule and track the treatment given to each patient"
        action={<Button onClick={() => setModal(true)}>+ New Treatment</Button>}
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">In Progress</p>
          <p className="mt-1.5 text-2xl font-bold text-navy-700">{summary.inProgress}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Completed</p>
          <p className="mt-1.5 text-2xl font-bold text-emerald-600">{summary.completed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Average Progress</p>
          <div className="mt-2 flex items-center gap-3">
            <ProgressBar value={summary.avgProgress} />
            <span className="text-sm font-bold text-slate-700">{summary.avgProgress}%</span>
          </div>
        </Card>
      </div>

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            className="sm:col-span-2"
            placeholder="Search by patient, treatment or doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search treatments"
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {loading && !data ? (
          <LoadingBlock label="Loading treatments" />
        ) : error && !data ? (
          <ErrorBlock error={error} onRetry={reload} />
        ) : treatments.length === 0 ? (
          <EmptyState
            title="No treatments found"
            description="Create a care plan to start tracking treatment progress."
            action={
              <Button size="sm" onClick={() => setModal(true)}>
                + New Treatment
              </Button>
            }
          />
        ) : (
          <Table
            columns={[
              { key: "treatment", header: "Treatment" },
              { key: "patient", header: "Patient" },
              { key: "doctor", header: "Doctor" },
              { key: "period", header: "Period" },
              { key: "progress", header: "Progress" },
              { key: "status", header: "Status" },
              { key: "actions", header: "Actions", className: "text-right" },
            ]}
          >
            {treatments.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <Td>
                  <p className="font-medium text-slate-800">{t.treatmentName}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge tone="slate">{t.category || "General"}</Badge>
                    <span className="font-mono text-[11px] text-slate-400">{t.id}</span>
                  </div>
                </Td>
                <Td>
                  <Link
                    to={`/patients/${t.patientId}`}
                    className="font-medium text-slate-800 hover:text-brand-700 hover:underline"
                  >
                    {t.patientName}
                  </Link>
                  {t.admissionId ? (
                    <p className="font-mono text-xs text-slate-500">{t.admissionId}</p>
                  ) : (
                    <p className="text-xs text-slate-400">Outpatient</p>
                  )}
                </Td>
                <Td>
                  <span className="text-sm">{t.doctorName || "-"}</span>
                </Td>
                <Td>
                  <p className="whitespace-nowrap text-xs text-slate-600">
                    {formatDate(t.startDate)}
                    {t.endDate ? ` - ${formatDate(t.endDate)}` : ""}
                  </p>
                </Td>
                <Td className="min-w-36">
                  <div className="flex items-center gap-2">
                    <ProgressBar
                      value={t.progress}
                      tone={
                        t.status === "Completed"
                          ? "emerald"
                          : t.status === "On Hold"
                            ? "amber"
                            : "brand"
                      }
                    />
                    <span className="w-9 shrink-0 text-right text-xs font-medium text-slate-600">
                      {t.progress}%
                    </span>
                  </div>
                </Td>
                <Td>
                  <StatusBadge status={t.status} />
                </Td>
                <Td className="text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    {t.status !== "Completed" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => bumpProgress(t)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-navy-700 transition hover:bg-navy-50"
                        >
                          +25%
                        </button>
                        {t.status !== "In Progress" ? (
                          <button
                            type="button"
                            onClick={() => setTreatmentStatus(t, "In Progress")}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
                          >
                            Start
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setTreatmentStatus(t, "Completed")}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Complete
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove(t)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <TreatmentModal
        open={modal}
        onClose={() => setModal(false)}
        doctors={doctors}
        admissions={activeAdmissions}
        onSaved={async () => {
          setModal(false);
          await reload({ quiet: true });
        }}
      />
    </div>
  );
}

function TreatmentModal({ open, onClose, doctors, admissions, onSaved }) {
  const toast = useToast();

  const fields = [
    { name: "patientId", label: "Patient UHID or Name", required: true, placeholder: "e.g. PAT-1005" },
    { name: "treatmentName", label: "Treatment Name", required: true, placeholder: "e.g. IV Antibiotics" },
    {
      name: "category",
      label: "Category",
      type: "select",
      options: TREATMENT_CATEGORIES,
      placeholder: "Select category",
    },
    {
      name: "doctorId",
      label: "Treating Doctor",
      type: "select",
      span: "full",
      options: doctors.map((d) => ({ value: d.id, label: `${d.name} - ${d.specialization}` })),
      placeholder: "Select doctor",
    },
    {
      name: "admissionId",
      label: "Linked Admission",
      type: "select",
      options: admissions.map((a) => ({ value: a.id, label: `${a.id} - ${a.patientName} (${a.ward})` })),
      placeholder: "Outpatient (no admission)",
      hint: "Leave blank for outpatient treatments.",
    },
    { name: "startDate", label: "Start Date", type: "date", required: true },
    { name: "endDate", label: "End Date", type: "date" },
    { name: "status", label: "Status", type: "select", options: STATUSES },
    { name: "progress", label: "Progress (%)", type: "number", min: 0, max: 100 },
    { name: "notes", label: "Clinical Notes", type: "textarea", placeholder: "Medication, dosage, observations" },
  ];

  const initial = {
    patientId: "",
    treatmentName: "",
    category: "Medication",
    doctorId: "",
    admissionId: "",
    startDate: today(),
    endDate: "",
    status: "Planned",
    progress: 0,
    notes: "",
  };

  async function submit(values) {
    const created = await api.treatments.create({
      ...values,
      admissionId: values.admissionId || null,
      doctorId: values.doctorId || undefined,
      progress: Number(values.progress) || 0,
    });
    toast.success(`Treatment ${created.id} created for ${created.patientName}.`);
    await onSaved();
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={submit}
      title="New Treatment / Care Plan"
      subtitle="Record a treatment step for an inpatient or outpatient"
      submitLabel="Create Treatment"
      fields={fields}
      initial={initial}
    />
  );
}
