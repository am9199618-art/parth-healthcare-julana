import { Link } from "react-router-dom";
import { useDashboard } from "../api/useApi.js";
import {
  Card,
  CardHeader,
  StatCard,
  StatusBadge,
  LoadingBlock,
  ErrorBlock,
  Badge,
  ProgressBar,
  EmptyState,
  PageHeader,
} from "../components/ui.jsx";
import { formatDate, formatCurrency, initials, relativeDay, today } from "../utils.js";
import { HOSPITAL_FALLBACK, SERVICES } from "../constants.js";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { data, loading, error, reload } = useDashboard();

  if (loading && !data) return <LoadingBlock label="Loading dashboard" />;
  if (error && !data) return <ErrorBlock error={error} onRetry={reload} />;
  if (!data) return null;

  const { stats, upcomingAppointments, activeAdmissions, activeTreatments, recentPatients } = data;

  return (
    <div>
      <PageHeader
        title={`${greeting()}, Staff`}
        subtitle={`${formatDate(today())} - ${HOSPITAL_FALLBACK.name}, ${HOSPITAL_FALLBACK.city}`}
        action={
          <>
            <Link
              to="/patients"
              className="inline-flex items-center rounded-lg bg-surface px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-300 transition hover:bg-slate-50"
            >
              Patient Directory
            </Link>
            <Link
              to="/appointments"
              className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
            >
              Book Appointment
            </Link>
          </>
        }
      />

      {/* Headline numbers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Patients"
          value={stats.totalPatients}
          hint="All registered patients"
          tone="teal"
          icon={<IconUsers />}
        />
        <StatCard
          label="Currently Admitted"
          value={stats.admittedPatients}
          hint={`${stats.occupiedBeds} beds occupied`}
          tone="blue"
          icon={<IconBed />}
        />
        <StatCard
          label="Appointments Today"
          value={stats.appointmentsToday}
          hint={`${stats.pendingAppointments} awaiting confirmation`}
          tone="amber"
          icon={<IconCalendar />}
        />
        <StatCard
          label="Active Care Plans"
          value={stats.activeTreatments}
          hint={`${stats.totalDischarges} discharges so far`}
          tone="green"
          icon={<IconTreatment />}
        />
      </div>

      {/* Revenue strip */}
      <Card className="mt-4 p-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Collected
            </p>
            <p className="mt-1.5 text-2xl font-bold text-emerald-600">
              {formatCurrency(stats.revenue)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Outstanding
            </p>
            <p className="mt-1.5 text-2xl font-bold text-amber-600">
              {formatCurrency(stats.outstanding)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Discharges Today
            </p>
            <p className="mt-1.5 text-2xl font-bold text-slate-800">
              {stats.dischargedToday}
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Upcoming appointments */}
        <Card>
          <CardHeader
            title="Upcoming Appointments"
            subtitle={`${stats.appointmentsThisWeek} booked in the next 7 days`}
            action={
              <Link to="/appointments" className="text-sm font-medium text-brand-700 hover:underline">
                View all
              </Link>
            }
          />
          {upcomingAppointments.length === 0 ? (
            <EmptyState
              title="No upcoming appointments"
              description="Booked OPD slots will appear here."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingAppointments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">
                    {initials(a.patientName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{a.patientName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {a.doctorName} &middot; {a.timeSlot}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-slate-700">{formatDate(a.date)}</p>
                    <p className="text-[11px] text-slate-400">{relativeDay(a.date)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Inpatients */}
        <Card>
          <CardHeader
            title="Currently Admitted"
            subtitle="Active beds and ward allocation"
            action={
              <Link to="/admissions" className="text-sm font-medium text-brand-700 hover:underline">
                View all
              </Link>
            }
          />
          {activeAdmissions.length === 0 ? (
            <EmptyState title="No active admissions" description="All beds are currently free." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {activeAdmissions.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      <Link to={`/patients/${a.patientId}`} className="hover:text-brand-700 hover:underline">
                        {a.patientName}
                      </Link>
                    </p>
                    <p className="truncate text-xs text-slate-500">{a.reason}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone="blue">{a.ward}</Badge>
                    <p className="mt-1 text-xs text-slate-500">Bed {a.bedNo}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Care plans */}
        <Card>
          <CardHeader
            title="Treatments in Progress"
            subtitle="Live progress of active care plans"
            action={
              <Link to="/treatments" className="text-sm font-medium text-brand-700 hover:underline">
                View all
              </Link>
            }
          />
          {activeTreatments.length === 0 ? (
            <EmptyState title="No active treatments" description="Care plans will show progress here." />
          ) : (
            <ul className="space-y-4 px-5 py-4">
              {activeTreatments.map((t) => (
                <li key={t.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{t.treatmentName}</p>
                      <p className="truncate text-xs text-slate-500">
                        {t.patientName} &middot; {t.doctorName || "Unassigned"}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <ProgressBar value={t.progress} tone={t.status === "On Hold" ? "amber" : "brand"} />
                    <span className="w-9 shrink-0 text-right text-xs font-medium text-slate-600">
                      {t.progress}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* New patients */}
        <Card>
          <CardHeader
            title="Recently Registered"
            subtitle="Latest patient records"
            action={
              <Link to="/patients" className="text-sm font-medium text-brand-700 hover:underline">
                View all
              </Link>
            }
          />
          {recentPatients.length === 0 ? (
            <EmptyState title="No patients registered" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentPatients.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy-700">
                    {initials(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/patients/${p.id}`}
                      className="block truncate text-sm font-medium text-slate-800 hover:text-brand-700 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {p.id} &middot; {p.age} yrs &middot; {p.gender}
                    </p>
                  </div>
                  {p.bloodGroup ? <Badge tone="red">{p.bloodGroup}</Badge> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Services overview */}
      <Card className="mt-4">
        <CardHeader title="Departments & Services" subtitle={`Care available at ${HOSPITAL_FALLBACK.name}`} />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <div key={service.name} className="rounded-lg border border-slate-200 p-4">
              <span className="text-xl">{service.icon}</span>
              <p className="mt-2 text-sm font-semibold text-slate-800">{service.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{service.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* Inline icons keep the dashboard dependency-free. */
function IconUsers() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  );
}
function IconBed() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6M3 18h18M7 10V7a2 2 0 012-2h6a2 2 0 012 2v3" strokeLinecap="round" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" strokeLinecap="round" />
    </svg>
  );
}
function IconTreatment() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M12 12v3M10.5 13.5h3" strokeLinecap="round" />
    </svg>
  );
}
