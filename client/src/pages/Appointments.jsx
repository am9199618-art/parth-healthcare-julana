import { useEffect, useMemo, useState } from "react";
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
import { formatDate, formatCurrency, initials, relativeDay, today } from "../utils.js";

const STATUS_FILTERS = ["", "Pending", "Confirmed", "Completed", "Cancelled"];

export default function Appointments() {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("upcoming");
  const [modal, setModal] = useState(false);

  const { data, loading, error, reload } = useApi(
    () => api.appointments.list({ status, search }),
    [status, search],
  );

  const { data: doctorsData } = useApi(() => api.doctors.list(), []);
  const doctors = doctorsData?.doctors || [];

  const appointments = data?.appointments || [];
  const t = today();

  const visible = useMemo(() => {
    if (scope === "upcoming") return appointments.filter((a) => a.date >= t);
    if (scope === "past") return appointments.filter((a) => a.date < t);
    return appointments;
  }, [appointments, scope, t]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const a of visible) {
      if (!map.has(a.date)) map.set(a.date, []);
      map.get(a.date).push(a);
    }
    return [...map.entries()].sort((x, y) => x[0].localeCompare(y[0]));
  }, [visible]);

  async function changeStatus(appointment, next) {
    try {
      await api.appointments.update(appointment.id, { status: next });
      toast.success(`${appointment.patientName}'s appointment marked ${next.toLowerCase()}.`);
      await reload({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove(appointment) {
    if (!window.confirm(`Delete appointment ${appointment.id}?`)) return;
    try {
      await api.appointments.remove(appointment.id);
      toast.success("Appointment deleted.");
      await reload({ quiet: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Book and track OPD appointments across every department"
        action={<Button onClick={() => setModal(true)}>+ Book Appointment</Button>}
      />

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Time range">
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="all">All appointments</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            {STATUS_FILTERS.map((s) => (
              <option key={s || "all"} value={s}>
                {s || "All statuses"}
              </option>
            ))}
          </Select>
          <Input
            className="sm:col-span-2"
            placeholder="Search by patient, doctor or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search appointments"
          />
        </div>
      </Card>

      {loading && !data ? (
        <LoadingBlock label="Loading appointments" />
      ) : error && !data ? (
        <ErrorBlock error={error} onRetry={reload} />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            title="No appointments here"
            description="Book an OPD slot to see it listed by date."
            action={
              <Button size="sm" onClick={() => setModal(true)}>
                + Book Appointment
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, list]) => (
            <Card key={date}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{formatDate(date)}</h3>
                  <p className="text-xs text-slate-500">{relativeDay(date)}</p>
                </div>
                <Badge tone="teal">
                  {list.length} appointment{list.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <Table
                columns={[
                  { key: "patient", header: "Patient" },
                  { key: "doctor", header: "Doctor" },
                  { key: "slot", header: "Slot" },
                  { key: "reason", header: "Reason" },
                  { key: "fee", header: "Fee" },
                  { key: "status", header: "Status" },
                  { key: "actions", header: "Actions", className: "text-right" },
                ]}
              >
                {list.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">
                          {initials(a.patientName)}
                        </div>
                        <div className="min-w-0">
                          {a.patientId ? (
                            <Link
                              to={`/patients/${a.patientId}`}
                              className="block truncate font-medium text-slate-800 hover:text-brand-700 hover:underline"
                            >
                              {a.patientName}
                            </Link>
                          ) : (
                            <span className="block truncate font-medium text-slate-800">
                              {a.patientName}
                            </span>
                          )}
                          <p className="truncate text-xs text-slate-500">{a.phone || a.patientId || a.id}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-sm font-medium text-slate-800">{a.doctorName}</p>
                      <p className="text-xs text-slate-500">{a.specialization}</p>
                    </Td>
                    <Td>
                      <span className="whitespace-nowrap text-sm">{a.timeSlot}</span>
                    </Td>
                    <Td>
                      <span className="text-sm">{a.reason}</span>
                    </Td>
                    <Td>
                      <span className="whitespace-nowrap text-sm">{formatCurrency(a.opdFee)}</span>
                    </Td>
                    <Td>
                      <StatusBadge status={a.status} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {a.status === "Pending" ? (
                          <button
                            type="button"
                            onClick={() => changeStatus(a, "Confirmed")}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
                          >
                            Confirm
                          </button>
                        ) : null}
                        {a.status !== "Completed" && a.status !== "Cancelled" ? (
                          <button
                            type="button"
                            onClick={() => changeStatus(a, "Completed")}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-navy-700 transition hover:bg-navy-50"
                          >
                            Complete
                          </button>
                        ) : null}
                        {a.status !== "Cancelled" ? (
                          <button
                            type="button"
                            onClick={() => changeStatus(a, "Cancelled")}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
                          >
                            Cancel
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => remove(a)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </Table>
            </Card>
          ))}
        </div>
      )}

      <BookingModal
        open={modal}
        onClose={() => setModal(false)}
        doctors={doctors}
        onBooked={async () => {
          setModal(false);
          await reload({ quiet: true });
        }}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Booking form: picks a doctor, then shows only that doctor's free slots.
 * ------------------------------------------------------------------------ */
function BookingModal({ open, onClose, doctors, onBooked }) {
  const toast = useToast();
  // Mirrors the doctor and date that are owned by FormModal, so the slot
  // picker can react to them.
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(today());
  const [timeSlot, setTimeSlot] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotError, setSlotError] = useState("");

  const INITIAL = {
    patientId: "",
    patientName: "",
    phone: "",
    doctorId: "",
    date: today(),
    reason: "",
    notes: "",
    status: "Confirmed",
  };

  // Reset whenever the modal opens.
  useEffect(() => {
    if (open) {
      setDoctorId("");
      setDate(today());
      setTimeSlot("");
      setSlots([]);
      setSlotError("");
    }
  }, [open]);

  /** Called by FormModal whenever any field changes. */
  function handleValuesChange(values) {
    const nextDoctor = values.doctorId || "";
    const nextDate = values.date || "";
    // Changing the doctor or day invalidates the chosen slot.
    if (nextDoctor !== doctorId || nextDate !== date) {
      setDoctorId(nextDoctor);
      setDate(nextDate);
      setTimeSlot("");
    }
  }

  // Fetch live slot availability for the selected doctor + date.
  useEffect(() => {
    if (!open || !doctorId) {
      setSlots([]);
      return undefined;
    }
    let cancelled = false;
    api.appointments
      .slots(doctorId, date)
      .then((res) => {
        if (cancelled) return;
        setSlots(res.slots || []);
        setSlotError("");
      })
      .catch((err) => {
        if (!cancelled) setSlotError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [open, doctorId, date]);

  const doctorOptions = doctors.map((d) => ({
    value: d.id,
    label: `${d.name} - ${d.specialization}`,
  }));

  const activeSlots = slots.filter((s) => !s.booked);

  async function submit(values) {
    try {
      const created = await api.appointments.create({
        ...values,
        // The slot is chosen from the chip buttons below, not the field list.
        timeSlot,
        patientId: values.patientId || undefined,
      });
      toast.success(`Appointment ${created.id} booked for ${created.patientName}.`);
      await onBooked();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={submit}
      onValuesChange={handleValuesChange}
      title="Book Appointment"
      subtitle="Pick a department doctor and an available OPD slot"
      submitLabel="Book Appointment"
      fields={[
        { name: "patientId", label: "Registered Patient (optional)", placeholder: "PAT-1005 - links the visit to a record" },
        { name: "patientName", label: "Patient Name", required: true, placeholder: "Full name" },
        { name: "phone", label: "Contact Number", placeholder: "+91 98120 45678" },
        { name: "doctorId", label: "Doctor", type: "select", required: true, options: doctorOptions, span: "full" },
        { name: "date", label: "Appointment Date", type: "date", required: true },
        { name: "status", label: "Status", type: "select", options: ["Pending", "Confirmed"] },
        { name: "reason", label: "Reason for Visit", required: true, placeholder: "e.g. Fever and cough for 3 days", span: "full" },
        { name: "notes", label: "Notes", type: "textarea", placeholder: "Optional remarks" },
      ]}
      initial={INITIAL}
    >
      {/* Slot chooser - only meaningful once a doctor is selected. */}
      <div className="sm:col-span-2">
        <p className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
          Time Slot <span className="text-rose-500">*</span>
        </p>
        {!doctorId ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
            Select a doctor to see their available OPD slots.
          </p>
        ) : slotError ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700">{slotError}</p>
        ) : slots.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            This doctor has no listed OPD slots for the selected date.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {slots.map(({ slot, booked }) => (
                <button
                  key={slot}
                  type="button"
                  disabled={booked}
                  onClick={() => setTimeSlot(slot)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    booked
                      ? "cursor-not-allowed bg-slate-100 text-slate-400 line-through"
                      : timeSlot === slot
                        ? "bg-brand-600 text-white"
                        : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {activeSlots.length} of {slots.length} slots free on {formatDate(date)}.
            </p>
          </>
        )}
        {/* The chosen slot is merged into the payload by submit(). */}
      </div>
    </FormModal>
  );
}
