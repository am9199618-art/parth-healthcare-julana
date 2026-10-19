import { forwardRef, useEffect } from "react";

/* -------------------------------------------------------------------------- */
/*  Buttons                                                                     */
/* -------------------------------------------------------------------------- */

const BUTTON_VARIANTS = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300",
  secondary:
    "bg-surface text-slate-700 ring-1 ring-slate-300 shadow-sm hover:bg-slate-50 active:bg-slate-100",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
};

const BUTTON_SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", className = "", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    />
  );
});

/* -------------------------------------------------------------------------- */
/*  Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

export function Card({ className = "", children }) {
  return (
    <section className={`rounded-xl bg-surface shadow-sm ring-1 ring-slate-200 ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, action, className = "" }) {
  return (
    <header className={`flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 ${className}`}>
      <div>
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Form controls                                                               */
/* -------------------------------------------------------------------------- */

const CONTROL =
  "w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500";

export function Field({ label, error, hint, required, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      {label ? (
        <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
          {label}
          {required ? <span className="text-rose-500">*</span> : null}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = forwardRef(function Input({ className = "", invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} ${invalid ? "border-rose-400 ring-rose-200" : ""} ${className}`}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className = "", invalid, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} ${invalid ? "border-rose-400" : ""} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ className = "", rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={`${CONTROL} ${className}`} {...props} />;
});

/* -------------------------------------------------------------------------- */
/*  Badges                                                                      */
/* -------------------------------------------------------------------------- */

const BADGE_TONES = {
  teal: "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/30",
  blue: "bg-navy-50 text-navy-700 ring-navy-200 dark:bg-navy-500/15 dark:text-blue-300 dark:ring-navy-500/30",
  green:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  red: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
  slate: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10",
};

export function Badge({ tone = "slate", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Map a domain status string to a badge colour. */
export function statusTone(status) {
  const map = {
    Active: "green",
    Admitted: "green",
    Pending: "amber",
    Confirmed: "blue",
    Completed: "teal",
    Cancelled: "red",
    Discharged: "slate",
    "In Progress": "blue",
    Planned: "amber",
    "On Hold": "red",
    Paid: "green",
    Unpaid: "red",
    "Partially Paid": "amber",
  };
  return map[status] || "slate";
}

export const StatusBadge = ({ status }) => <Badge tone={statusTone(status)}>{status}</Badge>;

/* -------------------------------------------------------------------------- */
/*  Table                                                                       */
/* -------------------------------------------------------------------------- */

export function Table({ columns, children, empty = null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase ${
                  col.className || ""
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export const Td = ({ className = "", children, ...props }) => (
  <td className={`px-4 py-3 align-middle text-slate-700 ${className}`} {...props}>
    {children}
  </td>
);

/* -------------------------------------------------------------------------- */
/*  States                                                                      */
/* -------------------------------------------------------------------------- */

export function Spinner({ className = "h-5 w-5" }) {
  return (
    <svg className={`animate-spin text-brand-600 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function LoadingBlock({ label = "Loading" }) {
  return (
    <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-slate-500">
      <Spinner />
      {label}...
    </div>
  );
}

export function ErrorBlock({ error, onRetry }) {
  return (
    <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1">{error?.message || "Unexpected error"}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-xl text-brand-600">
        +
      </div>
      <div>
        <p className="font-medium text-slate-700">{title}</p>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Modal                                                                       */
/* -------------------------------------------------------------------------- */

export function Modal({ open, onClose, title, subtitle, children, footer, size = "lg" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:p-8">
      <div
        className={`w-full ${widths[size]} rounded-xl bg-surface shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
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
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Misc                                                                        */
/* -------------------------------------------------------------------------- */

export function StatCard({ label, value, hint, tone = "teal", icon }) {
  const tones = {
    teal: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
    blue: "bg-navy-50 text-navy-700 dark:bg-navy-500/15 dark:text-blue-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    red: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {hint ? <p className="mt-1 truncate text-xs text-slate-500">{hint}</p> : null}
        </div>
        {icon ? (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
            {icon}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

export function ProgressBar({ value = 0, tone = "brand" }) {
  const width = Math.min(100, Math.max(0, Number(value) || 0));
  const bar = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-brand-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function DetailItem({ label, value, className = "" }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value || "-"}</dd>
    </div>
  );
}

export function EmptyRow({ colSpan, children = "No records found." }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-slate-500">
        {children}
      </td>
    </tr>
  );
}
