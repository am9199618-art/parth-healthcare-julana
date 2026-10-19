import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { AuthProvider, useAuth } from "./firebase/auth.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { Spinner } from "./components/ui.jsx";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Patients from "./pages/Patients.jsx";
import PatientDetail from "./pages/PatientDetail.jsx";
import Admissions from "./pages/Admissions.jsx";
import Treatments from "./pages/Treatments.jsx";
import Appointments from "./pages/Appointments.jsx";
import Discharges from "./pages/Discharges.jsx";
import Doctors from "./pages/Doctors.jsx";
import NotFound from "./pages/NotFound.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

/**
 * Patient records are confidential, so every route except /login requires a
 * signed-in staff account. Without Firebase configured (local Express mode)
 * access stays open for development.
 */
function RequireAuth({ children }) {
  const { user, initialising, configured } = useAuth();

  if (initialising) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!configured) return children;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <Layout>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/patients" element={<Patients />} />
                      <Route path="/patients/:id" element={<PatientDetail />} />
                      <Route path="/admissions" element={<Admissions />} />
                      <Route path="/treatments" element={<Treatments />} />
                      <Route path="/appointments" element={<Appointments />} />
                      <Route path="/discharges" element={<Discharges />} />
                      <Route path="/doctors" element={<Doctors />} />
                      <Route path="/home" element={<Navigate to="/" replace />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </ErrorBoundary>
                </Layout>
              </RequireAuth>
            }
          />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
