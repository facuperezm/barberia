import { NextResponse } from "next/server";
import { db } from "@/drizzle";
import {
  appointments,
  scheduleOverrides,
  services,
  workingHours,
} from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { rateLimit, getClientIdentifier } from "@/lib/rate-limit";
import {
  getDayOfWeek,
  generateTimeSlots,
  isSlotBlocked,
} from "@/lib/dates";

export async function GET(request: Request) {
  // Apply rate limiting: 30 requests per minute
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(identifier, { maxRequests: 30, windowSeconds: 60 });

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const barberId = searchParams.get("barberId");
    const serviceId = searchParams.get("serviceId"); // Ensure serviceId is captured

    if (!dateStr || !barberId || !serviceId) {
      // Updated validation
      return NextResponse.json(
        { error: "Date, barberId, and serviceId are required" },
        { status: 400 },
      );
    }

    // Parse date using Argentina timezone utilities
    const formattedDate = dateStr; // Already in YYYY-MM-DD format
    const dayOfWeek = getDayOfWeek(dateStr); // 0 = Sunday, 1 = Monday, etc.

    // First check for schedule overrides (one-off exceptions like days off)
    const overrides = await db
      .select()
      .from(scheduleOverrides)
      .where(
        and(
          eq(scheduleOverrides.barberId, parseInt(barberId)),
          eq(scheduleOverrides.date, formattedDate),
        ),
      );

    let isWorkingDay = false;
    let timeSlotRanges: { start: string; end: string }[] = [];

    if (overrides.length > 0) {
      // Use the override for this specific date
      const override = overrides[0];
      isWorkingDay = override.isWorkingDay;
      if (isWorkingDay && override.availableSlots && override.availableSlots.length > 0) {
        timeSlotRanges = override.availableSlots;
      }
    } else {
      // No override - fetch the regular weekly schedule from workingHours table
      const [regularSchedule] = await db
        .select()
        .from(workingHours)
        .where(
          and(
            eq(workingHours.barberId, parseInt(barberId)),
            eq(workingHours.dayOfWeek, dayOfWeek),
          ),
        );

      if (regularSchedule) {
        isWorkingDay = regularSchedule.isWorking;
        if (isWorkingDay) {
          // Prefer availableSlots JSONB if present, otherwise use startTime/endTime
          const slots = regularSchedule.availableSlots as
            | { start: string; end: string }[]
            | null;
          if (slots && slots.length > 0) {
            timeSlotRanges = slots;
          } else {
            timeSlotRanges = [
              { start: regularSchedule.startTime, end: regularSchedule.endTime },
            ];
          }
        }
      }
      // If no schedule record exists, isWorkingDay remains false (no availability)
    }

    if (!isWorkingDay || timeSlotRanges.length === 0) {
      // Not a working day or no time slots defined
      return NextResponse.json([]);
    }

    // Get service duration based on serviceId
    let serviceDuration = 30; // default duration
    const [service] = await db
      .select()
      .from(services)
      .where(eq(services.id, parseInt(serviceId)));
    if (service) {
      serviceDuration = service.durationMinutes;
    }

    // Generate all possible time slots based on all working time ranges
    // This supports split shifts (e.g., 9am-12pm and 2pm-6pm)
    const timeSlots: string[] = [];
    for (const range of timeSlotRanges) {
      const slotsForRange = generateTimeSlots(range.start, range.end, serviceDuration);
      timeSlots.push(...slotsForRange);
    }

    // Get existing appointments with their service durations
    const existingAppointments = await db
      .select({
        id: appointments.id,
        appointmentAt: appointments.appointmentAt,
        endTime: appointments.endTime,
        date: appointments.date,
        time: appointments.time,
        barberId: appointments.barberId,
      })
      .from(appointments)
      .where(eq(appointments.date, formattedDate));

    // Map slots to include availability
    const slotsWithAvailability = timeSlots.map((time) => {
      const blocked = existingAppointments.some((apt) => {
        // Only check appointments for the same barber
        if (apt.barberId !== parseInt(barberId)) {
          return false;
        }

        // Strip seconds from appointment time if it exists
        const appointmentTime = apt.time ? apt.time.slice(0, 5) : null; // 'HH:mm'

        if (!appointmentTime) {
          return false;
        }

        return isSlotBlocked(time, serviceDuration, appointmentTime, serviceDuration);
      });

      return { time, available: !blocked };
    });

    return NextResponse.json(slotsWithAvailability);
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 },
    );
  }
}
