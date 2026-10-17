/**
 * Thin wrapper around fetch for the Parth Healthcare API.
 *
 * In dev, Vite proxies /api to the Express server (see vite.config.js), so a
 * relative base works in both development and production builds.
 */
const BASE = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields || null;
  }
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "Cannot reach the hospital server. Make sure the API is running on port 4000.",
      0,
    );
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && payload.error) ||
      `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload?.fields);
  }

  return payload;
}

/** Build a query string, dropping empty values so URLs stay tidy. */
function qs(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  }
  const out = search.toString();
  return out ? `?${out}` : "";
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  del: (path) => request("DELETE", path),

  meta: () => request("GET", "/meta"),
  dashboard: () => request("GET", "/dashboard"),

  patients: {
    list: (params) => request("GET", `/patients${qs(params)}`),
    get: (id) => request("GET", `/patients/${id}`),
    create: (data) => request("POST", "/patients", data),
    update: (id, data) => request("PUT", `/patients/${id}`, data),
    remove: (id, force = false) => request("DELETE", `/patients/${id}${force ? "?force=true" : ""}`),
  },

  doctors: {
    list: (params) => request("GET", `/doctors${qs(params)}`),
    get: (id) => request("GET", `/doctors/${id}`),
    create: (data) => request("POST", "/doctors", data),
    update: (id, data) => request("PUT", `/doctors/${id}`, data),
    remove: (id) => request("DELETE", `/doctors/${id}`),
  },

  admissions: {
    list: (params) => request("GET", `/admissions${qs(params)}`),
    get: (id) => request("GET", `/admissions/${id}`),
    create: (data) => request("POST", "/admissions", data),
    update: (id, data) => request("PUT", `/admissions/${id}`, data),
    remove: (id) => request("DELETE", `/admissions/${id}`),
  },

  discharges: {
    list: (params) => request("GET", `/discharges${qs(params)}`),
    get: (id) => request("GET", `/discharges/${id}`),
    create: (data) => request("POST", "/discharges", data),
    update: (id, data) => request("PUT", `/discharges/${id}`, data),
    remove: (id) => request("DELETE", `/discharges/${id}`),
  },

  appointments: {
    list: (params) => request("GET", `/appointments${qs(params)}`),
    get: (id) => request("GET", `/appointments/${id}`),
    slots: (doctorId, date) => request("GET", `/appointments/slots${qs({ doctorId, date })}`),
    create: (data) => request("POST", "/appointments", data),
    update: (id, data) => request("PUT", `/appointments/${id}`, data),
    remove: (id) => request("DELETE", `/appointments/${id}`),
  },

  treatments: {
    list: (params) => request("GET", `/treatments${qs(params)}`),
    get: (id) => request("GET", `/treatments/${id}`),
    create: (data) => request("POST", "/treatments", data),
    update: (id, data) => request("PUT", `/treatments/${id}`, data),
    remove: (id) => request("DELETE", `/treatments/${id}`),
  },
};
