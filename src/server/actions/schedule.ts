"use server";

import { between, eq } from "drizzle-orm";

import { and } from "drizzle-orm";

import { db } from "@/drizzle";
import { appointments } from "@/drizzle/schema";
import { addDays, startOfWeek, today, formatDateISO } from "@/lib/dates";

interface Appointment {
  id: number;
  customerName: string | null;
  service: string;
  time: string | null;
  status: "pending" | "confirmed" | "cancelled" | "completed";
}

interface DaySchedule {
  date: string; // ISO string
  appointments: Appointment[];
  availableSlots: number;
  totalSlots: number;
}

export async function getWeeklySchedule(
  employeeId: number,
): Promise<DaySchedule[]> {
  const todayDate = today();
  // If it's Sunday (day 0), start from tomorrow (Monday)
  // Otherwise start from the beginning of the week (Monday)
  const weekStart =
    todayDate.getDay() === 0
      ? addDays(todayDate, 1)
      : startOfWeek(todayDate);
  const weekEnd = addDays(weekStart, 6);

  // Fetch appointments for the employee within the week
  const fetchedAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.barberId, employeeId),
        between(
          appointments.date,
          formatDateISO(weekStart),
          formatDateISO(weekEnd),
        ),
      ),
    );

  // Organize appointments by date
  const scheduleMap: Record<string, Appointment[]> = {};

  fetchedAppointments.forEach((apt) => {
    if (!apt.date) return; // Skip appointments without dates

    const dateKey = apt.date.toString().split("T")[0]; // YYYY-MM-DD
    if (!scheduleMap[dateKey]) {
      scheduleMap[dateKey] = [];
    }
    scheduleMap[dateKey].push({
      id: apt.id,
      customerName: apt.customerName || "N/A",
      service: apt.serviceId.toString(),
      time: apt.time || "00:00",
      status: apt.status as "pending" | "confirmed" | "cancelled" | "completed",
    });
  });

  // Generate the week's schedule
  const schedule: DaySchedule[] = Array.from({ length: 6 }).map((_, index) => {
    const date = addDays(weekStart, index);
    const dateKey = formatDateISO(date);
    const appointmentsForDay = scheduleMap[dateKey] || [];
    const totalSlots = 8; // Define total slots per day
    const availableSlots = totalSlots - appointmentsForDay.length;

    return {
      date: formatDateISO(date),
      appointments: appointmentsForDay,
      availableSlots,
      totalSlots,
    };
  });

  return schedule;
}
