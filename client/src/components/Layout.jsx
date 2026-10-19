import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { HOSPITAL_FALLBACK } from "../constants.js";
import { useMeta } from "../api/useApi.js";
import { useAuth } from "../firebase/auth.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { backend } from "../api/index.js";

/** Sun / moon switch for the light and dark themes. */
function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
    >
      {isDark ? (
        // Moon: currently dark, click for light.
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21.75 15.5A9.75 9.75 0 0110.5 3a9.75 9.75 0 1011.25 12.5z" />
        </svg>
      ) : (
        // Sun: currently light, click for dark.
        <svg
          className="h-4.5 w-4.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
        </svg>
      )}
    </button>
  );
}

const NAV = [
  {
    to: "/",
    label: "Dashboard",
    end: true,
    icon: (
      <path d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    to: "/patients",
    label: "Patients",
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" />
      </>
    ),
  },
  {
    to: "/admissions",
    label: "Admissions",
    icon: (
      <>
        <path d="M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6" strokeLinecap="round" />
        <path d="M7 10V7a2 2 0 012-2h6a2 2 0 012 2v3M3 18h18M7 14h3" strokeLinecap="round" />
      </>
    ),
  },
  {
    to: "/treatments",
    label: "Treatments",
    icon: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M12 12v3M10.5 13.5h3" strokeLinecap="round" />
      </>
    ),
  },
  {
    to: "/appointments",
    label: "Appointments",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 11h18" strokeLinecap="round" />
      </>
    ),
  },
  {
    to: "/discharges",
    label: "Discharges",
    icon: (
      <>
        <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" />
      </>
    ),
  },
  {
    to: "/doctors",
    label: "Doctors",
    icon: (
      <>
        <path d="M12 2v6M9 5h6M7 22v-4a5 5 0 1110 0v4" strokeLinecap="round" />
      </>
    ),
  },
];

function Logo({ className = "h-9 w-9" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0f766e" />
      <path d="M26 14h12v12h12v12H38v12H26V38H14V26h12z" fill="#fff" />
      <circle cx="32" cy="32" r="26" stroke="#5eead4" strokeWidth="3" />
    </svg>
  );
}

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: meta } = useMeta();
  const { user, logout, configured } = useAuth();
  const hospital = meta?.hospital || HOSPITAL_FALLBACK;
  const location = useLocation();

  const closeOnMobile = () => setMobileOpen(false);
  const staffName = "Administrator";

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gold-50">Parth Life Care</p>
          <p className="truncate text-xs text-gold-100/80">Hospital, Julana</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={closeOnMobile}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-gold-500 text-gold-950 shadow-sm"
                  : "text-gold-50/85 hover:bg-gold-700/70 hover:text-gold-50"
              }`
            }
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {item.icon}
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gold-500/30 px-5 py-4 text-xs text-gold-100/85">
        <p className="font-semibold text-gold-50">24x7 Emergency</p>
        <p className="mt-0.5">{hospital.emergencyNote?.replace(/^24x7 Emergency\s*-\s*/i, "") || "Helpline"}</p>
        <p className="mt-0.5 font-semibold text-gold-50">{hospital.emergency}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-gradient-to-b from-gold-700 to-gold-900 lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/50"
            onClick={closeOnMobile}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-gradient-to-b from-gold-700 to-gold-900 shadow-xl">
            <div className="h-full">{sidebar}</div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-surface/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{hospital.name}</p>
              <p className="truncate text-xs text-slate-500">
                {hospital.addressLine}, {hospital.city} - {hospital.pincode}
              </p>
            </div>

            <span className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              OPD &amp; Emergency Open
            </span>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3">
              <ThemeToggle />
              <div className="hidden text-right sm:block">
                <p className="max-w-36 truncate text-xs font-semibold text-slate-700">{staffName}</p>
                <p className="text-[11px] text-slate-400">
                  {backend === "firestore" ? "Firestore" : "Local API"}
                </p>
              </div>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700"
                title={staffName}
              >
                {staffName.slice(0, 2).toUpperCase()}
              </div>
              {configured ? (
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-rose-600"
                  title="Sign out"
                >
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8" key={location.pathname}>
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-surface px-4 py-4 text-center text-xs text-slate-500 sm:px-6">
          &copy; {new Date().getFullYear()} {hospital.name}, {hospital.city}, {hospital.district},{" "}
          {hospital.state}. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
