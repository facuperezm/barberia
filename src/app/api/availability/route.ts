import { NextResponse } from "next/server";
import { db } from "@/drizzle";
import {
  appointments,
  barbers,
  scheduleOverrides,
  services,
} from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { format, addMinutes, parse } from "date-fns";

// Generate time slots between start and end times
function generateTimeSlots(start: string, end: string, duration: number = 30) {
  const slots = [];
  let currentTime = new Date(`1970-01-01T${start}`);
  const endTime = new Date(`1970-01-01T${end}`);

  while (currentTime < endTime) {
    slots.push(format(currentTime, "HH:mm"));
    currentTime = new Date(currentTime.getTime() + duration * 60000);
  }

  return slots;
}

// Check if a time slot is blocked by an existing appointment
function isSlotBlockedByAppointment(
  slotTime: string,
  appointment: { time: string; duration: number },
): boolean {
  const slotStart = parse(slotTime, "HH:mm", new Date());
  const appointmentStart = parse(appointment.time, "HH:mm", new Date());
  const appointmentEnd = addMinutes(appointmentStart, appointment.duration);

  // A slot is blocked if it starts during another appointment
  // or if it falls within the duration of another appointment
  const slotEnd = addMinutes(slotStart, 30); // Each slot is 30 minutes
  return (
    (slotStart >= appointmentStart && slotStart < appointmentEnd) ||
    (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
    (slotStart <= appointmentStart && slotEnd >= appointmentEnd)
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const barberId = searchParams.get("barberId");
    const serviceId = searchParams.get("serviceId");

    if (!dateStr || !barberId) {
      return NextResponse.json(
        { error: "Date and barberId are required" },
        { status: 400 },
      );
    }

    // Parse the date string to a Date object
    const date = new Date(dateStr);

    // Format date for database query (YYYY-MM-DD)
    const formattedDate = format(date, "yyyy-MM-dd");

    // Get barber's default schedule and any overrides
    const [barber] = await db
      .select()
      .from(barbers)
      .where(eq(barbers.id, parseInt(barberId)));

    if (!barber) {
      return NextResponse.json({ error: "Barber not found" }, { status: 404 });
    }

    // Get service duration if serviceId is provided
    let serviceDuration = 30; // default duration
    if (serviceId) {
      const [service] = await db
        .select()
        .from(services)
        .where(eq(services.id, parseInt(serviceId)));
      if (service) {
        serviceDuration = service.duration;
      }
    }

    const [override] = await db
      .select()
      .from(scheduleOverrides)
      .where(
        and(
          eq(scheduleOverrides.barberId, parseInt(barberId)),
          eq(scheduleOverrides.date, formattedDate),
        ),
      );

    // Get the day of week (0-6)
    const dayOfWeek = date.getDay().toString();

    // Determine available slots based on override or default schedule
    const timeSlots: string[] = [];

    if (override) {
      if (!override.isWorkingDay) {
        return NextResponse.json([]);
      }
      // Use override slots
      if (override.availableSlots && override.availableSlots.length > 0) {
        override.availableSlots.forEach((slot) => {
          timeSlots.push(...generateTimeSlots(slot.start, slot.end));
        });
      }
    } else {
      // Use default working hours
      const defaultSchedule = barber.defaultWorkingHours?.[dayOfWeek];
      if (!defaultSchedule?.isWorking) {
        return NextResponse.json([]);
      }
      defaultSchedule.slots.forEach((slot) => {
        timeSlots.push(...generateTimeSlots(slot.start, slot.end));
      });
    }

    // Get existing appointments with their service durations
    const existingAppointments = await db
      .select({
        time: appointments.time,
        duration: services.duration,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.barberId, parseInt(barberId)),
          eq(appointments.date, formattedDate),
          sql`${appointments.status} != 'cancelled'`,
        ),
      );

    // Filter out unavailable slots
    const availableSlots = timeSlots.filter((time) => {
      // Check if this time slot is blocked by any existing appointment
      const isBlocked = existingAppointments.some((apt) =>
        isSlotBlockedByAppointment(time, {
          time: apt.time,
          duration: apt.duration || 30,
        }),
      );

      // Check if there's enough time for the requested service
      const slotTime = parse(time, "HH:mm", new Date());
      const serviceEndTime = addMinutes(slotTime, serviceDuration);
      const lastPossibleSlot = parse(
        timeSlots[timeSlots.length - 1],
        "HH:mm",
        new Date(),
      );
      const hasEnoughTime = serviceEndTime <= addMinutes(lastPossibleSlot, 30);

      return !isBlocked && hasEnoughTime;
    });

    return NextResponse.json(availableSlots.map((time) => ({ time })));
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 },
    );
  }
}
