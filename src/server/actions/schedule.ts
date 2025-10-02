"use server";

import { between, eq } from "drizzle-orm";

import { and } from "drizzle-orm";

import { db } from "@/drizzle";
import { appointments } from "@/drizzle/schema";
import { addDays, startOfWeek } from "date-fns";

interface Appointment {
  id: number;
  customerName: string;
  service: string;
  time: string;
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
  const today = new Date();
  // If it's Sunday, we want to start from tomorrow (Monday)
  const weekStart =
    today.getDay() === 0
      ? addDays(today, 1)
      : startOfWeek(today, { weekStartsOn: 1 });
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
          weekStart.toISOString(),
          weekEnd.toISOString(),
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
    const dateKey = date.toISOString().split("T")[0];
    const appointmentsForDay = scheduleMap[dateKey] || [];
    const totalSlots = 8; // Define total slots per day
    const availableSlots = totalSlots - appointmentsForDay.length;

    return {
      date: date.toISOString(),
      appointments: appointmentsForDay,
      availableSlots,
      totalSlots,
    };
  });

  return schedule;
}
