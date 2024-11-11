import { db } from "@/db";
import { appointments } from "@/db/schema";
import { addDays, startOfWeek } from "date-fns";
import { and, between } from "drizzle-orm";
import { eq } from "drizzle-orm";

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
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = addDays(weekStart, 6); // Sunday

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
    const dateKey = apt.date.toString().split("T")[0]; // YYYY-MM-DD
    if (!scheduleMap[dateKey]) {
      scheduleMap[dateKey] = [];
    }
    scheduleMap[dateKey].push({
      id: apt.id,
      customerName: apt.customerName,
      service: apt.serviceId.toString(),
      time: apt.time,
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
