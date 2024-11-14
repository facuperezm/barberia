import { db } from "@/drizzle";
import {
  appointments,
  schedules,
  scheduleExceptions,
  barbers,
} from "@/drizzle/schema";
import { useQuery } from "@tanstack/react-query";
import { eq, and } from "drizzle-orm";
import { type Appointment } from "./use-appointments";

export interface TimeSlot {
  time: string; // e.g., "09:00", "09:30", etc.
}

// Define your business logic for generating time slots based on working hours
const generateTimeSlots = (
  start: string,
  end: string,
  interval = 30,
): string[] => {
  const slots: string[] = [];
  const [startHour, startMin] = start.split(":").map(Number);
  const [endHour, endMin] = end.split(":").map(Number);
  const current = new Date();
  current.setHours(startHour, startMin, 0, 0);
  const endTime = new Date();
  endTime.setHours(endHour, endMin, 0, 0);

  while (current <= endTime) {
    const hours = current.getHours().toString().padStart(2, "0");
    const minutes = current.getMinutes().toString().padStart(2, "0");
    slots.push(`${hours}:${minutes}`);
    current.setMinutes(current.getMinutes() + interval);
  }

  return slots;
};

const fetchAvailableTimes = async (
  date: string,
  barberId: string,
): Promise<TimeSlot[]> => {
  if (!date || !barberId) return [];

  const selectedDate = new Date(date);
  const dayOfWeek = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
  });

  // Fetch regular schedule
  const schedule = await db
    .select()
    .from(barbers)
    .where(
      and(
        eq(schedules.barberId, Number(barberId)),
        eq(schedules.dayOfWeek, dayOfWeek),
      ),
    )
    .limit(1);

  // Fetch any exceptions
  const exception = await db
    .select()
    .from(scheduleExceptions)
    .where(
      and(
        eq(scheduleExceptions.barberId, Number(barberId)),
        eq(scheduleExceptions.date, date),
      ),
    )
    .limit(1);

  let availableTimeSlots: string[] = [];

  if (exception.length > 0) {
    if (
      exception[0].isWorking &&
      exception[0].startTime &&
      exception[0].endTime
    ) {
      availableTimeSlots = generateTimeSlots(
        exception[0].startTime,
        exception[0].endTime,
      );
    } else {
      // Barber is not working on this date
      availableTimeSlots = [];
    }
  } else if (schedule.length > 0) {
    availableTimeSlots = generateTimeSlots(
      schedule[0].startTime!,
      schedule[0].endTime!,
    );
  } else {
    // No schedule found for this day
    availableTimeSlots = [];
  }

  // Fetch booked appointments
  const bookedAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.date, date),
        eq(appointments.barberId, Number(barberId)),
        eq(appointments.status, "pending"), // Only consider pending appointments
      ),
    );

  const bookedTimes = bookedAppointments.map(
    (apt: unknown) => (apt as Appointment).time,
  );

  // Filter out booked times
  const availableSlots = availableTimeSlots
    .filter((time) => !bookedTimes.includes(time))
    .map((time) => ({ time }));

  return availableSlots;
};

export const useAvailableTimes = (date: string, barberId: string) => {
  return useQuery<TimeSlot[], Error>({
    queryKey: ["availableTimes", date, barberId],
    queryFn: () => fetchAvailableTimes(date, barberId),
    enabled: !!date && !!barberId,
    staleTime: 1000 * 60, // 1 minute
    retry: 1,
  });
};
