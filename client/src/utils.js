/** Shared display helpers used across pages. */

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

/** Whole days between two YYYY-MM-DD dates (b - a). */
export function daysBetween(a, b) {
  if (!a || !b) return 0;
  const start = new Date(`${a}T00:00:00Z`);
  const end = new Date(`${b}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}

export function formatCurrency(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString("en-IN")}`;
}

/** "in 3 days" / "2 days ago" relative label. */
export function relativeDay(value) {
  if (!value) return "";
  const diff = daysBetween(today(), String(value).length === 10 ? value : String(value).slice(0, 10));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return diff > 0 ? `in ${diff} days` : `${Math.abs(diff)} days ago`;
}

export function initials(name = "") {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
