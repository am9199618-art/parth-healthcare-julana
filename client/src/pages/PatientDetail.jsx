import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/index.js";
import { useApi } from "../api/useApi.js";
import {
  Card,
  CardHeader,
  Badge,
  StatusBadge,
  ProgressBar,
  Table,
  Td,
  PageHeader,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
  DetailItem,
  Button,
} from "../components/ui.jsx";
import { formatDate, formatCurrency, initials, daysBetween, today } from "../utils.js";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(() => api.patients.get(id), [id]);

  if (loading && !data) return <LoadingBlock label="Loading patient record" />;
  if (error && !data) return <ErrorBlock error={error} onRetry={reload} />;
  if (!data) return null;

  const { patient, admissions, discharges, treatments, appointments } = data;
  const activeAdmission = admissions.find((a) => a.status === "Active");
  const stayDays = activeAdmission
    ? daysBetween(activeAdmission.admittedDate, today()) + 1
    : 0;

  return (
    <div>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate("/patients")}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-brand-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M12.79 5.23a.75.75 0 01-.02 1.06L8.83 10l4.02 3.71a.75.75 0 11-1.04 1.06l-4.5-4.15a.75.75 0 010-1.06l4.5-4.15a.75.75 0 011.04-.18z" />
          </svg>
          Back to directory
        </button>
      </div>

      {/* Patient header card */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl font-bold text-brand-700">
              {initials(patient.name)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
                {patient.bloodGroup ? <Badge tone="red">{patient.bloodGroup}</Badge> : null}
                {activeAdmission ? <StatusBadge status="Admitted" /> : <Badge tone="slate">Outpatient</Badge>}
              </div>
              <p className="mt-1 font-mono text-sm text-slate-500">{patient.id}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>{patient.age} years</span>
                <span>{patient.gender}</span>
                <span>{patient.phone}</span>
                {patient.email ? <span>{patient.email}</span> : null}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {activeAdmission ? (
              <Link
                to="/discharges"
                className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
              >
                Discharge
              </Link>
            ) : (
              <Link
                to="/admissions"
                className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
              >
                Admit
              </Link>
            )}
            <Link
              to="/treatments"
              className="inline-flex items-center rounded-lg bg-surface px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-300 transition hover:bg-slate-50"
            >
              Add Treatment
            </Link>
          </div>
        </div>

        {activeAdmission ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-200 bg-brand-50/60 px-5 py-3 text-sm">
            <span className="text-slate-600">
              <strong className="font-semibold text-slate-800">{activeAdmission.ward}</strong> &middot; Bed{" "}
              {activeAdmission.bedNo}
            </span>
            <span className="text-slate-600">
              Admitted <strong className="font-semibold text-slate-800">{formatDate(activeAdmission.admittedDate)}</strong>
            </span>
            <span className="text-slate-600">
              Stay:{" "}
              <strong className="font-semibold text-slate-800">
                {stayDays} day{stayDays === 1 ? "" : "s"}
              </strong>
            </span>
            <span className="text-slate-600">
              Reason: <strong className="font-semibold text-slate-800">{activeAdmission.reason}</strong>
            </span>
          </div>
        ) : null}
      </Card>

      {/* Demographics + clinical info */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Patient Information" />
          <dl className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
            <DetailItem label="Age" value={`${patient.age} years`} />
            <DetailItem label="Gender" value={patient.gender} />
            <DetailItem label="Blood Group" value={patient.bloodGroup} />
            <DetailItem label="Phone" value={patient.phone} />
            <DetailItem label="Email" value={patient.email} />
            <DetailItem label="Registered" value={formatDate(patient.createdAt)} />
            <DetailItem label="Village / City" value={patient.city} />
            <DetailItem label="District" value={patient.district} />
            <DetailItem label="State" value={patient.state} />
            <DetailItem label="Pincode" value={patient.pincode} />
            <DetailItem label="Address" value={patient.address} className="col-span-2 sm:col-span-3" />
            <DetailItem
              label="Emergency Contact"
              value={
                patient.emergencyContactName
                  ? `${patient.emergencyContactName} (${patient.emergencyContactPhone || "no phone"})`
                  : null
              }
              className="col-span-2"
            />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Clinical Notes" />
          <div className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Allergies</p>
              <p
                className={`mt-1 text-sm font-medium ${
                  patient.allergies && patient.allergies.toLowerCase() !== "none"
                    ? "text-rose-600"
                    : "text-slate-800"
                }`}
              >
                {patient.allergies || "None known"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Medical History</p>
              <p className="mt-1 text-sm text-slate-700">{patient.medicalHistory || "No history recorded."}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">
                Total visits recorded: <strong className="text-slate-800">{admissions.length}</strong>
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Treatments */}
      <Card className="mb-4">
        <CardHeader
          title="Treatment & Care Plan"
          subtitle={`${treatments.length} treatment(s) on record`}
          action={
            <Link to="/treatments" className="text-sm font-medium text-brand-700 hover:underline">
              Manage
            </Link>
          }
        />
        {treatments.length === 0 ? (
          <EmptyState title="No treatments recorded" description="Care plans for this patient will appear here." />
        ) : (
          <Table
            columns={[
              { key: "treatment", header: "Treatment" },
              { key: "category", header: "Category" },
              { key: "doctor", header: "Doctor" },
              { key: "period", header: "Period" },
              { key: "progress", header: "Progress" },
              { key: "status", header: "Status" },
            ]}
          >
            {treatments.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <Td>
                  <p className="font-medium text-slate-800">{t.treatmentName}</p>
                  <p className="text-xs text-slate-500">{t.id}</p>
                </Td>
                <Td>
                  <Badge tone="slate">{t.category || "-"}</Badge>
                </Td>
                <Td>
                  <span className="text-sm">{t.doctorName || "-"}</span>
                </Td>
                <Td>
                  <span className="whitespace-nowrap text-xs text-slate-600">
                    {formatDate(t.startDate)}
                    {t.endDate ? ` - ${formatDate(t.endDate)}` : " - ongoing"}
                  </span>
                </Td>
                <Td className="min-w-32">
                  <div className="flex items-center gap-2">
                    <ProgressBar
                      value={t.progress}
                      tone={t.status === "On Hold" ? "amber" : t.status === "Completed" ? "emerald" : "brand"}
                    />
                    <span className="w-9 shrink-0 text-right text-xs text-slate-600">{t.progress}%</span>
                  </div>
                </Td>
                <Td>
                  <StatusBadge status={t.status} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Admissions & discharges */}
        <Card>
          <CardHeader title="Admission History" subtitle={`${admissions.length} stay(s)`} />
          {admissions.length === 0 ? (
            <EmptyState title="No admissions yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {admissions.map((a) => {
                const discharge = discharges.find((d) => d.admissionId === a.id);
                return (
                  <li key={a.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{a.reason}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {a.ward} &middot; Bed {a.bedNo} &middot; {formatDate(a.admittedDate)}
                          {a.dischargeDate ? ` to ${formatDate(a.dischargeDate)}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                    {discharge ? (
                      <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                        <p>
                          <strong className="text-slate-800">Diagnosis:</strong> {discharge.finalDiagnosis}
                        </p>
                        <p className="mt-1">
                          <strong className="text-slate-800">Condition:</strong>{" "}
                          {discharge.conditionAtDischarge} &middot;{" "}
                          <strong className="text-slate-800">Bill:</strong>{" "}
                          {formatCurrency(discharge.totalBill)} ({discharge.paymentStatus})
                        </p>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Appointments */}
        <Card>
          <CardHeader title="Appointment History" subtitle={`${appointments.length} visit(s)`} />
          {appointments.length === 0 ? (
            <EmptyState title="No appointments booked" />
          ) : (
            <Table
              columns={[
                { key: "date", header: "Date" },
                { key: "doctor", header: "Doctor" },
                { key: "reason", header: "Reason" },
                { key: "status", header: "Status" },
              ]}
            >
              {appointments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <Td>
                    <p className="whitespace-nowrap text-sm font-medium text-slate-800">
                      {formatDate(a.date)}
                    </p>
                    <p className="text-xs text-slate-500">{a.timeSlot}</p>
                  </Td>
                  <Td>
                    <p className="text-sm">{a.doctorName}</p>
                    <p className="text-xs text-slate-500">{a.specialization}</p>
                  </Td>
                  <Td>
                    <span className="text-sm">{a.reason}</span>
                  </Td>
                  <Td>
                    <StatusBadge status={a.status} />
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Link to="/patients">
          <Button variant="secondary">Back to Directory</Button>
        </Link>
      </div>
    </div>
  );
}
