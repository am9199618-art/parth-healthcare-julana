import { Router } from "express";
import { table } from "../db.js";
import { asyncHandler } from "../validate.js";

const router = Router();

/** GET /api/dashboard - headline numbers plus the lists the home page shows. */
router.get(
  "/",
  asyncHandler((req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    const patients = table("patients");
    const admissions = table("admissions");
    const discharges = table("discharges");
    const appointments = table("appointments");
    const treatments = table("treatments");

    const activeAdmissions = admissions.filter((a) => a.status === "Active");
    const occupiedBeds = new Set(activeAdmissions.map((a) => `${a.ward}/${a.bedNo}`));

    const upcoming = appointments
      .filter((a) => a.date >= today && a.status !== "Cancelled")
      .sort((a, b) => `${a.date}${a.timeSlot}`.localeCompare(`${b.date}${b.timeSlot}`))
      .slice(0, 6);

    const activeTreatments = treatments.filter((t) => t.status === "In Progress" || t.status === "Planned");

    res.json({
      stats: {
        totalPatients: patients.length,
        admittedPatients: activeAdmissions.length,
        dischargedToday: discharges.filter((d) => d.dischargeDate === today).length,
        totalDischarges: discharges.length,
        doctors: table("doctors").length,
        appointmentsToday: appointments.filter((a) => a.date === today && a.status !== "Cancelled").length,
        appointmentsThisWeek: appointments.filter(
          (a) => a.date >= today && a.date <= weekAhead && a.status !== "Cancelled",
        ).length,
        pendingAppointments: appointments.filter((a) => a.status === "Pending").length,
        activeTreatments: activeTreatments.length,
        occupiedBeds: occupiedBeds.size,
        revenue: discharges.reduce((sum, d) => sum + (d.paymentStatus === "Paid" ? Number(d.totalBill || 0) : 0), 0),
        outstanding: discharges.reduce((sum, d) => sum + (d.paymentStatus !== "Paid" ? Number(d.totalBill || 0) : 0), 0),
      },
      upcomingAppointments: upcoming,
      activeAdmissions: activeAdmissions.slice(0, 6),
      activeTreatments: activeTreatments.slice(0, 6),
      recentPatients: [...patients]
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 5),
    });
  })
);

export default router;
