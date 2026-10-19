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
  Badge,
  StatusBadge,
  PageHeader,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
} from "../components/ui.jsx";
import { formatDate, formatCurrency, today, daysBetween } from "../utils.js";
import { BED_TYPES, WARDS, BEDS_BY_WARD, DAILY_RATES } from "../constants.js";

export default function Admissions() {
  const toast = useToast();
  const [status, setStatus] = useState("Active");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);

  const { data, loading, error, reload } = useApi(
    () => api.admissions.list({ status, search }),
    [status, search],
  );

  // Bed availability is derived from currently active admissions.
  const { data: activeData, reload: reloadActive } = useApi(
    () => api.admissions.list({ status: "Active" }),
    [],
  );
  const takenBeds = useMemo(
    () => new Set((activeData?.admissions || []).map((a) => `${a.ward}/${a.bedNo}`)),
    [activeData],
  );

  const admissions = data?.admissions || [];

  // Only the ward and bed live here, because the bed picker (rendered as a
  // FormModal child) drives them. Every other input belongs to FormModal.
  const [ward, setWard] = useState("General Ward");
  const [bedNo, setBedNo] = useState("");

  const wardBeds = BEDS_BY_WARD[ward] || [];
  const availableBeds = wardBeds.filter((b) => !takenBeds.has(`${ward}/${b}`));

  function changeWard(nextWard) {
    setWard(nextWard);
    setBedNo("");
  }

  function openModal() {
    setWard("General Ward");
    setBedNo("");
    setModal(true);
  }

  async function handleSubmit(values) {
    const created = await api.admissions.create({
      ...values,
      ward,
      bedNo,
    });
    toast.success(`${created.patientName} admitted to ${created.ward}, bed ${created.bedNo}.`);
    setModal(false);
    await Promise.all([reload({ quiet: true }), reloadActive({ quiet: true })]);
  }

  return (
    <div>
      <PageHeader
        title="Admissions"
        subtitle="Admit patients, allocate beds and monitor ward occupancy"
        action={<Button onClick={openModal}>+ New Admission</Button>}
      />

      {/* Occupancy strip */}
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All admissions</option>
            <option value="Active">Currently admitted</option>
            <option value="Discharged">Discharged</option>
          </Select>
          <Input
            className="sm:col-span-2"
            placeholder="Search by patient, ward, bed number or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search admissions"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="green">{takenBeds.size} beds occupied</Badge>
          <Badge tone="blue">
            {admissions.length} record(s) {status ? `with status "${status}"` : "in total"}
          </Badge>
        </div>
      </Card>

      <Card>
        {loading && !data ? (
          <LoadingBlock label="Loading admissions" />
        ) : error && !data ? (
          <ErrorBlock error={error} onRetry={reload} />
        ) : admissions.length === 0 ? (
          <EmptyState
            title="No admissions found"
            description={status === "Active" ? "No patients are currently admitted." : "Adjust the filters above."}
            action={
              <Button size="sm" onClick={openModal}>
                + New Admission
              </Button>
            }
          />
        ) : (
          <Table
            columns={[
              { key: "patient", header: "Patient" },
              { key: "admission", header: "Admission" },
              { key: "bed", header: "Ward / Bed" },
              { key: "reason", header: "Reason" },
              { key: "dates", header: "Dates" },
              { key: "charge", header: "Charge / day" },
              { key: "status", header: "Status" },
            ]}
          >
            {admissions.map((a) => {
              const days =
                a.status === "Active"
                  ? daysBetween(a.admittedDate, today()) + 1
                  : daysBetween(a.admittedDate, a.dischargeDate) + 1;
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
                    <span className="text-xs text-slate-500">{formatDate(a.admittedDate)}</span>
                    <p className="text-xs text-slate-500">
                      by {a.admittedBy || "-"} &middot; {days} day{days === 1 ? "" : "s"}
                    </p>
                  </Td>
                  <Td>
                    <Badge tone="blue">{a.ward}</Badge>
                    <p className="mt-1 text-xs text-slate-500">Bed {a.bedNo}</p>
                  </Td>
                  <Td>
                    <span className="text-sm">{a.reason}</span>
                  </Td>
                  <Td>
                    <p className="whitespace-nowrap text-xs text-slate-600">
                      {formatDate(a.admittedDate)}
                    </p>
                    <p className="whitespace-nowrap text-xs text-slate-400">
                      {a.dischargeDate
                        ? `to ${formatDate(a.dischargeDate)}`
                        : `expected ${formatDate(a.expectedDischarge)}`}
                    </p>
                  </Td>
                  <Td>
                    <span className="whitespace-nowrap text-sm font-medium text-slate-800">
                      {formatCurrency(a.dailyCharge)}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={a.status} />
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <FormModal
        open={modal}
        onClose={() => setModal(false)}
        onSubmit={handleSubmit}
        title="New Admission"
        subtitle="Allocate a bed to a registered patient"
        submitLabel="Admit Patient"
        fields={[
          { name: "patientId", label: "Patient UHID or Name", required: true, span: "full", placeholder: "e.g. PAT-1005 or Ram Lal" },
          {
            name: "bedType",
            label: "Bed Type",
            type: "select",
            required: true,
            options: BED_TYPES.map((t) => ({ value: t, label: `${t} (₹${DAILY_RATES[t] ?? 1000}/day)` })),
          },
          { name: "reason", label: "Reason for Admission", required: true, placeholder: "e.g. Acute Gastroenteritis" },
          { name: "admittedBy", label: "Referred By", placeholder: "e.g. Dr. Anil Kumar / Emergency" },
        ]}
        initial={{
          patientId: "",
          bedType: "General",
          reason: "",
          admittedBy: "",
        }}
      >
        {/* The bed picker is interactive (its options depend on the selected
            ward), so it is rendered as a child instead of through the generic
            field list. The chosen ward and bed are merged in on submit. */}
        <div className="sm:col-span-2">
          <p className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
            Ward <span className="text-rose-500">*</span>
          </p>
          <Select value={ward} onChange={(e) => changeWard(e.target.value)}>
            {WARDS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </Select>

          <p className="mt-4 mb-2 text-sm font-medium text-slate-700">Available beds in {ward}</p>
          <div className="flex flex-wrap gap-2">
            {wardBeds.map((bed) => {
              const taken = takenBeds.has(`${ward}/${bed}`);
              return (
                <button
                  key={bed}
                  type="button"
                  disabled={taken}
                  onClick={() => setBedNo(bed)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    taken
                      ? "cursor-not-allowed bg-slate-100 text-slate-400 line-through"
                      : bedNo === bed
                        ? "bg-brand-600 text-white"
                        : "bg-surface text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {bed}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {availableBeds.length} of {wardBeds.length} beds free. Struck-through beds are occupied.
            {bedNo ? ` Selected bed: ${bedNo}.` : " No bed selected - one will be assigned."} The daily charge is
            set from the bed type.
          </p>
        </div>
      </FormModal>
    </div>
  );
}
