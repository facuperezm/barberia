import { NextResponse } from "next/server";
import { db } from "@/drizzle";
import { appointments, scheduleOverrides, services } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
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
  slotDuration: number,
): boolean {
  // Parse slot start time
  const slotStart = parse(slotTime, "HH:mm", new Date());

  // Parse appointment start time
  const appointmentStart = parse(appointment.time, "HH:mm", new Date());

  // Calculate appointment end time
  const appointmentEnd = addMinutes(appointmentStart, appointment.duration);

  // Calculate slot end time
  const slotEnd = addMinutes(slotStart, slotDuration);

  // Determine if the slot is blocked
  const isBlocked =
    (slotStart >= appointmentStart && slotStart < appointmentEnd) ||
    (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
    (slotStart <= appointmentStart && slotEnd >= appointmentEnd);

  console.log("test");
  console.log(
    `Checking slot ${slotTime} - ${format(slotEnd, "HH:mm")} against appointment at ${format(
      appointmentStart,
      "HH:mm",
    )} for duration ${appointment.duration} minutes: ${
      isBlocked ? "Blocked" : "Available"
    }`,
  );

  return isBlocked;
}

export async function GET(request: Request) {
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

    // Parse the date string to a Date object
    const date = new Date(dateStr);

    // Format date for database query (YYYY-MM-DD)
    const formattedDate = format(dateStr, "yyyy-MM-dd");

    // Fetch barber's default schedule for the day
    const defaultSchedule = await db
      .select()
      .from(scheduleOverrides)
      .where(
        and(
          eq(scheduleOverrides.barberId, parseInt(barberId)),
          eq(scheduleOverrides.date, formattedDate),
        ),
      );

    let isWorkingDay = true;
    let workingHours = { start: "09:00", end: "17:00" }; // Default hours

    if (defaultSchedule.length > 0) {
      const override = defaultSchedule[0];
      isWorkingDay = override.isWorkingDay;
      if (
        isWorkingDay &&
        override.availableSlots &&
        override.availableSlots.length > 0
      ) {
        workingHours = {
          start: override.availableSlots[0].start,
          end: override.availableSlots[0].end,
        };
      }
    } else {
      // If no override, fetch from barbers table
      // (Implement fetching from barbers table if needed)
    }

    if (!isWorkingDay) {
      // If it's not a working day, return empty array
      return NextResponse.json([]);
    }

    // Get service duration based on serviceId
    let serviceDuration = 30; // default duration
    const [service] = await db
      .select()
      .from(services)
      .where(eq(services.id, parseInt(serviceId)));
    if (service) {
      serviceDuration = service.duration;
    } else {
      console.warn(
        `Service with ID ${serviceId} not found. Using default duration.`,
      );
    }

    // Generate all possible time slots based on working hours and service duration
    const timeSlots = generateTimeSlots(
      workingHours.start,
      workingHours.end,
      serviceDuration,
    );

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

    // Log existing appointments for debugging
    console.log("Existing Appointments:", existingAppointments);

    // Map slots to include availability
    const slotsWithAvailability = timeSlots.map((time) => {
      const isBlocked = existingAppointments.some((apt) => {
        // Only check appointments for the same barber
        if (apt.barberId !== parseInt(barberId)) {
          return false;
        }

        // Strip seconds from appointment time if it exists
        const appointmentTime = apt.time ? apt.time.slice(0, 5) : null; // 'HH:mm'

        if (!appointmentTime) {
          return false;
        }

        return isSlotBlockedByAppointment(
          time,
          {
            time: appointmentTime,
            duration: serviceDuration,
          },
          serviceDuration,
        );
      });

      return { time, available: !isBlocked };
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
