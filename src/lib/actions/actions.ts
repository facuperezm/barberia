"use server";

import { db } from "@/db";
import {
  reservations,
  adminUsers,
  schedule,
  services,
  employeeSchedules,
  employees,
} from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import bcrypt from "bcrypt";
import { sign } from "jsonwebtoken";

export async function createReservation(data: {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  date: string;
  time: string;
  serviceId: number;
}) {
  const result = await db.insert(reservations).values(data).returning();
  return result[0];
}

export async function getReservations() {
  return await db
    .select()
    .from(reservations)
    .orderBy(reservations.date, reservations.time);
}

export async function adminLogin(username: string, password: string) {
  const user = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);
  if (user.length === 0) {
    throw new Error("Invalid credentials");
  }

  let isValidPassword: boolean;
  try {
    isValidPassword = await bcrypt.compare(password, user[0].passwordHash);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    throw new Error("An error occurred during authentication");
  }

  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }

  const token = sign({ userId: user[0].id }, process.env.JWT_SECRET!, {
    expiresIn: "1h",
  });
  return token;
}

export async function getSchedule() {
  return await db.select().from(schedule);
}

export async function updateSchedule(
  scheduleData: { day: string; startTime: string; endTime: string }[],
) {
  await db.delete(schedule);
  return await db.insert(schedule).values(scheduleData).returning();
}

export async function getServices() {
  return await db.select().from(services);
}

export async function updateServices(
  servicesData: {
    id?: number;
    name: string;
    duration: number;
    price: number;
  }[],
) {
  const updatedServices = [];
  for (const service of servicesData) {
    if (service.id) {
      const [updatedService] = await db
        .update(services)
        .set({
          name: service.name,
          duration: service.duration,
          price: service.price,
        })
        .where(eq(services.id, service.id))
        .returning();
      updatedServices.push(updatedService);
    } else {
      const [newService] = await db
        .insert(services)
        .values({
          name: service.name,
          duration: service.duration,
          price: service.price,
        })
        .returning();
      updatedServices.push(newService);
    }
  }
  return updatedServices;
}

export async function getAvailableTimes(date: string, serviceId: number) {
  const dayOfWeek = new Date(date).getDay();
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const [scheduleForDay] = await db
    .select()
    .from(schedule)
    .where(eq(schedule.day, dayNames[dayOfWeek]));

  if (!scheduleForDay) {
    return [];
  }

  const [service] = await db
    .select()
    .from(services)
    .where(eq(services.id, serviceId));

  if (!service) {
    throw new Error("Service not found");
  }

  const existingReservations = await db
    .select()
    .from(reservations)
    .where(
      and(eq(reservations.date, date), eq(reservations.serviceId, serviceId)),
    );

  // Generate available time slots based on the schedule, service duration, and existing reservations
  const availableTimes = [];
  const currentTime = new Date(`${date}T${scheduleForDay.startTime}`);
  const endTime = new Date(`${date}T${scheduleForDay.endTime}`);

  while (currentTime < endTime) {
    const timeSlot = currentTime.toTimeString().slice(0, 5);
    if (!existingReservations.some((r) => r.time === timeSlot)) {
      availableTimes.push(timeSlot);
    }
    currentTime.setMinutes(currentTime.getMinutes() + service.duration);
  }

  return availableTimes;
}

export async function getEmployeeSchedule(startDate: string, endDate: string) {
  return await db
    .select()
    .from(employeeSchedules)
    .where(
      and(
        gte(employeeSchedules.date, startDate),
        lte(employeeSchedules.date, endDate),
      ),
    );
}

export async function updateEmployeeSchedule(scheduleData: {
  [date: string]: {
    [employeeId: string]: string[];
  };
}) {
  const updates = [];

  for (const [date, employeeSchedules] of Object.entries(scheduleData)) {
    for (const [employeeId, timeSlots] of Object.entries(employeeSchedules)) {
      // First, remove all existing schedules for this employee and date
      await db
        .delete(employeeSchedules)
        .where(
          and(
            eq(employeeSchedules.employeeId, parseInt(employeeId)),
            eq(employeeSchedules.date, date),
          ),
        );

      // Then, insert the new schedules
      const newSchedules = timeSlots.map((timeSlot) => ({
        employeeId: parseInt(employeeId),
        date,
        timeSlot,
        isAvailable: true,
      }));

      updates.push(db.insert(employeeSchedules).values(newSchedules));
    }
  }

  await Promise.all(updates);

  return { success: true, message: "Schedule updated successfully" };
}

export async function getEmployees() {
  return await db.select().from(employees);
}

export async function getEmployeeScheduleByDate(date: string) {
  return await db
    .select()
    .from(employeeSchedules)
    .where(eq(employeeSchedules.date, date));
}

export async function updateEmployeeScheduleSingle(scheduleData: {
  employeeId: number;
  date: string;
  timeSlots: string[];
}) {
  const { employeeId, date, timeSlots } = scheduleData;

  // First, remove all existing schedules for this employee and date
  await db
    .delete(employeeSchedules)
    .where(
      and(
        eq(employeeSchedules.employeeId, employeeId),
        eq(employeeSchedules.date, date),
      ),
    );

  // Then, insert the new schedules
  const newSchedules = timeSlots.map((timeSlot) => ({
    employeeId,
    date,
    timeSlot,
    isAvailable: true,
  }));

  return await db.insert(employeeSchedules).values(newSchedules).returning();
}
