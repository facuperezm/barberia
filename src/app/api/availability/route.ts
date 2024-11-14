import { NextResponse } from "next/server";
import { db } from "@/drizzle";
import { appointments, barbers, scheduleOverrides } from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { format } from "date-fns";

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

// Helper functions
function parseTime(time: string): Date {
  const parts = time.split(":");
  const date = new Date();
  date.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
  return date;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function isTimeWithinSchedule(time: string): boolean {
  // Implement logic to check if the time is within the barber's working hours
  return true;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const barberId = searchParams.get("barberId");

    const serviceDuration = Number(searchParams.get("duration")) || 30; // Default to 30 minutes
    const slotsNeeded = Math.ceil(serviceDuration / 30);

    if (!date || !barberId) {
      return NextResponse.json(
        { error: "Date and barberId are required" },
        { status: 400 },
      );
    }

    // Get barber's default schedule and any overrides
    const [barber] = await db
      .select()
      .from(barbers)
      .where(eq(barbers.id, parseInt(barberId)));

    if (!barber) {
      return NextResponse.json({ error: "Barber not found" }, { status: 404 });
    }

    const [override] = await db
      .select()
      .from(scheduleOverrides)
      .where(
        and(
          eq(scheduleOverrides.barberId, parseInt(barberId)),
          eq(scheduleOverrides.date, date),
        ),
      );

    // Get the day of week (0-6)
    const dayOfWeek = new Date(date.toString()).getUTCDay();
    console.log(dayOfWeek, "DAY OF WEEK according to date-fns");

    // Determine available slots based on override or default schedule
    const availableTimeSlots: string[] = [];

    if (override) {
      if (!override.isWorkingDay) {
        return NextResponse.json([]);
      }
      // Use override slots
      if (override.availableSlots) {
        override.availableSlots.forEach((slot) => {
          availableTimeSlots.push(...generateTimeSlots(slot.start, slot.end));
        });
      }
    } else {
      // Use default working hours
      const defaultSchedule = barber.defaultWorkingHours?.[dayOfWeek];
      if (!defaultSchedule?.isWorking) {
        return NextResponse.json([]);
      }
      defaultSchedule.slots.forEach((slot) => {
        availableTimeSlots.push(...generateTimeSlots(slot.start, slot.end));
      });
    }

    // Get existing appointments
    const existingAppointments = await db
      .select({
        time: appointments.time,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.barberId, parseInt(barberId)),
          eq(appointments.date, date),
          sql`${appointments.status} != 'cancelled'`,
        ),
      );

    // Convert existing appointments to a Set for faster lookup
    const bookedTimes = new Set(
      existingAppointments.map((apt) =>
        format(new Date(`1970-01-01T${apt.time}`), "HH:mm"),
      ),
    );

    // Create the availability array
    const availability = availableTimeSlots.map((slot) => {
      let isAvailable = true;

      for (let i = 0; i < slotsNeeded; i++) {
        const timeToCheck = addMinutes(parseTime(slot), i * 30);
        const formattedTime = format(timeToCheck, "HH:mm");
        if (
          bookedTimes.has(formattedTime) ||
          !isTimeWithinSchedule(formattedTime)
        ) {
          isAvailable = false;
          break;
        }
      }

      return {
        time: slot,
        available: isAvailable,
      };
    });

    return NextResponse.json(availability);
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 },
    );
  }
}
