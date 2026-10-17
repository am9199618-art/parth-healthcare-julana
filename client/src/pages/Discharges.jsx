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
  PageHeader,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
} from "../components/ui.jsx";
import { formatDate, formatCurrency, today } from "../utils.js";

const CONDITIONS = [
  "Recovered",
  "Stable",
  "Improved",
  "Referred to higher centre",
  "Under observation",
];

export default function Discharges() {
  const toast = useToast();
  const [paymentStatus, setPaymentStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null); // active admission to discharge
  const [viewing, setViewing] = useState(null); // discharge summary to display

  const { data, loading, error, reload } = useApi(
    () => api.discharges.list({ paymentStatus, search }),
    [paymentStatus, search],
  );

  const { data: activeData, reload: reloadActive } = useApi(
    () => api.admissions.list({ status: "Active" }),
    [],
  );

  const discharges = data?.discharges || [];
  const activeAdmissions = activeData?.admissions || [];

  const totals = {
    count: discharges.length,
    bill: discharges.reduce((sum, d) => sum + Number(d.totalBill || 0), 0),
    unpaid: discharges
      .filter((d) => d.paymentStatus !== "Paid")
      .reduce((sum, d) => sum + Number(d.totalBill || 0), 0),
  };

  async function markPaid(discharge) {
    try {
      await api.discharges.update(discharge.id, { paymentStatus: "Paid" });
      toast.success(`Payment recorded for ${discharge.patientName}.`);
      await reload({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function voidDischarge(discharge) {
    const ok = window.confirm(
      `Void the discharge record for ${discharge.patientName} (${discharge.id})?\n\n` +
        "The admission will be reopened as Active and the bed freed again.",
    );
    if (!ok) return;
    try {
      await api.discharges.remove(discharge.id);
      toast.success(`Discharge ${discharge.id} voided; admission reopened.`);
      await Promise.all([reload({ quiet: true }), reloadActive({ quiet: true })]);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Discharges"
        subtitle="Close admissions, write the clinical summary and settle bills"
      />

      {/* Patients awaiting discharge */}
      <Card className="mb-4">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Awaiting Discharge</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {activeAdmissions.length} patient(s) currently admitted
          </p>
        </div>
        {activeAdmissions.length === 0 ? (
          <EmptyState title="No patients admitted" description="Admitted patients appear here, ready for discharge." />
        ) : (
          <Table
            columns={[
              { key: "patient", header: "Patient" },
              { key: "bed", header: "Ward / Bed" },
              { key: "stay", header: "Stay Length" },
              { key: "reason", header: "Reason" },
              { key: "bill", header: "Running Bill" },
              { key: "action", header: "Action", className: "text-right" },
            ]}
          >
            {activeAdmissions.map((a) => {
              const days =
                Math.round(
                  (new Date(`${today()}T00:00:00Z`) -
                    new Date(`${a.admittedDate}T00:00:00Z`)) /
                    86400000,
                ) + 1;
              return (
                <tr key={a.id} className="hover:bg-slate-50">
                  <Td>
                    <Link
                      to={`/patients/${a.patientId}`}
                      className="font-medium text-slate-800 hover:text-brand-700 hover:underline"
                    >
                      {a.patientName}
                    </Link>
                    <p className="font-mono text-xs text-slate-500">{a.id}</p>
                  </Td>
                  <Td>
                    <Badge tone="blue">{a.ward}</Badge>
                    <p className="mt-1 text-xs text-slate-500">Bed {a.bedNo}</p>
                  </Td>
                  <Td>
                    <span className="whitespace-nowrap text-sm">
                      {days} day{days === 1 ? "" : "s"}
                    </span>
                    <p className="text-xs text-slate-500">from {formatDate(a.admittedDate)}</p>
                  </Td>
                  <Td>
                    <span className="text-sm">{a.reason}</span>
                  </Td>
                  <Td>
                    <span className="whitespace-nowrap text-sm font-semibold text-slate-800">
                      {formatCurrency(days * (a.dailyCharge || 0))}
                    </span>
                    <p className="text-xs text-slate-500">{formatCurrency(a.dailyCharge)}/day</p>
                  </Td>
                  <Td className="text-right">
                    <Button size="sm" onClick={() => setSelected(a)}>
                      Discharge
                    </Button>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {/* Discharge records */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Total Discharges
          </p>
          <p className="mt-1.5 text-2xl font-bold text-slate-800">{totals.count}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Total Billed</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-800">{formatCurrency(totals.bill)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Outstanding</p>
          <p className="mt-1.5 text-2xl font-bold text-amber-600">{formatCurrency(totals.unpaid)}</p>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="border-b border-slate-200 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              className="sm:col-span-2"
              placeholder="Search by patient, admission or diagnosis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search discharges"
            />
            <Select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              aria-label="Filter by payment status"
            >
              <option value="">All payment statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
            </Select>
          </div>
        </div>

        {loading && !data ? (
          <LoadingBlock label="Loading discharge records" />
        ) : error && !data ? (
          <ErrorBlock error={error} onRetry={reload} />
        ) : discharges.length === 0 ? (
          <EmptyState title="No discharge records" description="Completed discharges will be listed here." />
        ) : (
          <Table
            columns={[
              { key: "patient", header: "Patient" },
              { key: "period", header: "Stay Period" },
              { key: "diagnosis", header: "Final Diagnosis" },
              { key: "condition", header: "Condition" },
              { key: "bill", header: "Total Bill" },
              { key: "payment", header: "Payment" },
              { key: "actions", header: "Actions", className: "text-right" },
            ]}
          >
            {discharges.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <Td>
                  <Link
                    to={`/patients/${d.patientId}`}
                    className="font-medium text-slate-800 hover:text-brand-700 hover:underline"
                  >
                    {d.patientName}
                  </Link>
                  <p className="font-mono text-xs text-slate-500">{d.id}</p>
                </Td>
                <Td>
                  <p className="whitespace-nowrap text-xs text-slate-600">
                    {formatDate(d.admittedDate)} - {formatDate(d.dischargeDate)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {d.totalDays} day{d.totalDays === 1 ? "" : "s"} &middot; {d.ward} / {d.bedNo}
                  </p>
                </Td>
                <Td>
                  <span className="text-sm">{d.finalDiagnosis}</span>
                </Td>
                <Td>
                  <Badge tone={d.conditionAtDischarge === "Recovered" ? "green" : "slate"}>
                    {d.conditionAtDischarge || "-"}
                  </Badge>
                </Td>
                <Td>
                  <span className="whitespace-nowrap text-sm font-semibold text-slate-800">
                    {formatCurrency(d.totalBill)}
                  </span>
                </Td>
                <Td>
                  <StatusBadge status={d.paymentStatus} />
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setViewing(d)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                    >
                      Summary
                    </button>
                    {d.paymentStatus !== "Paid" ? (
                      <button
                        type="button"
                        onClick={() => markPaid(d)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                      >
                        Mark Paid
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => voidDischarge(d)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      Void
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <DischargeModal
        admission={selected}
        onClose={() => setSelected(null)}
        onDone={async () => {
          setSelected(null);
          await Promise.all([reload({ quiet: true }), reloadActive({ quiet: true })]);
        }}
      />

      <SummaryModal record={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Discharge form
 * ------------------------------------------------------------------------ */
function DischargeModal({ admission, onClose, onDone }) {
  const toast = useToast();

  const stayDays = admission
    ? Math.round(
        (new Date(`${today()}T00:00:00Z`) -
          new Date(`${admission.admittedDate}T00:00:00Z`)) /
          86400000,
      ) + 1
    : 1;
  const estimatedBill = admission ? stayDays * (admission.dailyCharge || 0) : 0;

  const fields = [
    { name: "finalDiagnosis", label: "Final Diagnosis", required: true, placeholder: "e.g. Acute Gastroenteritis" },
    { name: "conditionAtDischarge", label: "Condition at Discharge", type: "select", options: CONDITIONS },
    { name: "dischargeDate", label: "Discharge Date", type: "date", required: true },
    { name: "followUpDate", label: "Follow-up Date", type: "date" },
    { name: "treatmentSummary", label: "Treatment Summary", type: "textarea", placeholder: "Procedures, therapy given during the stay" },
    { name: "medicines", label: "Medicines on Discharge", type: "textarea", placeholder: "Name, dosage and duration" },
    { name: "advice", label: "Advice to Patient", type: "textarea", placeholder: "Rest, diet, warning signs" },
    {
      name: "totalBill",
      label: "Final Bill (₹)",
      type: "number",
      min: 0,
      hint: `Auto-calculated as ${stayDays} day(s) x ${formatCurrency(admission?.dailyCharge || 0)}.`,
    },
    { name: "paymentStatus", label: "Payment Status", type: "select", options: ["Unpaid", "Partially Paid", "Paid"] },
  ];

  const initial = {
    finalDiagnosis: admission?.reason || "",
    conditionAtDischarge: "Recovered",
    dischargeDate: today(),
    followUpDate: "",
    treatmentSummary: "",
    medicines: "",
    advice: "",
    totalBill: estimatedBill,
    paymentStatus: "Paid",
  };

  async function submit(values) {
    const created = await api.discharges.create({
      ...values,
      admissionId: admission.id,
      totalBill: Number(values.totalBill) || estimatedBill,
    });
    toast.success(
      `${created.patientName} discharged. Bill ${formatCurrency(created.totalBill)} (${created.paymentStatus}).`,
    );
    await onDone();
  }

  return (
    <FormModal
      open={Boolean(admission)}
      onClose={onClose}
      onSubmit={submit}
      title="Discharge Patient"
      subtitle={
        admission
          ? `${admission.patientName} - ${admission.ward}, bed ${admission.bedNo} (${admission.id})`
          : ""
      }
      submitLabel="Complete Discharge"
      size="xl"
      fields={fields}
      initial={initial}
    />
  );
}

/* --------------------------------------------------------------------------
 * Read-only discharge summary
 * ------------------------------------------------------------------------ */
function SummaryModal({ record, onClose }) {
  if (!record) return null;

  const rows = [
    ["Patient", record.patientName],
    ["Admission ID", record.admissionId],
    ["Admitted On", formatDate(record.admittedDate)],
    ["Discharged On", formatDate(record.dischargeDate)],
    ["Total Stay", `${record.totalDays} day(s)`],
    ["Ward / Bed", `${record.ward} / ${record.bedNo}`],
    ["Final Diagnosis", record.finalDiagnosis],
    ["Condition at Discharge", record.conditionAtDischarge],
    ["Follow-up On", formatDate(record.followUpDate)],
    ["Total Bill", formatCurrency(record.totalBill)],
    ["Payment Status", record.paymentStatus],
    ["Medicines", record.medicines],
    ["Treatment Summary", record.treatmentSummary],
    ["Advice", record.advice],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:p-8">
      <div
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Discharge Summary</h3>
            <p className="mt-0.5 font-mono text-xs text-slate-500">{record.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className={value?.length > 60 ? "sm:col-span-2" : ""}>
              <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{value || "-"}</dd>
            </div>
          ))}
        </dl>
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
