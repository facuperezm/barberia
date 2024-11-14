import { NextResponse } from "next/server";
import { db } from "@/drizzle";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { barbers, scheduleOverrides } from "@/drizzle/schema";

// Define the expected shape of time slots
const TimeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
});

// Define the expected shape of a day's schedule
const DayScheduleSchema = z.object({
  isWorking: z.boolean(),
  slots: z.array(TimeSlotSchema),
});

// Define the expected shape of the entire schedule
const ScheduleSchema = z.object({
  defaultWorkingHours: z.record(DayScheduleSchema),
});

type DaySchedule = {
  isWorking: boolean;
  slots: { start: string; end: string }[];
};

const convertCalendarDayToISODay = (calendarDay: number): number => {
  // Convert from frontend day (Sunday = 0) to database day (Sunday = 0)
  return calendarDay; // No conversion needed as they match
};

const convertISODayToCalendarDay = (isoDay: number): number => {
  // Convert from database day (Sunday = 0) to frontend day (Sunday = 0)
  return isoDay; // No conversion needed as they match
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "Invalid barber ID" }, { status: 400 });
  }

  try {
    const body = await request.json();

    // Validate the request body against our schema
    const parseResult = ScheduleSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid schedule format", details: parseResult.error },
        { status: 400 },
      );
    }

    // Convert the schedule from calendar days to ISO days
    const convertedSchedule = Object.entries(
      parseResult.data.defaultWorkingHours,
    ).reduce<Record<string, DaySchedule>>(
      (acc, [day, schedule]) => {
        // Only process numeric days
        if (/^\d+$/.test(day)) {
          const isoDay = convertCalendarDayToISODay(parseInt(day));
          acc[isoDay] = {
            isWorking: schedule.isWorking,
            slots: schedule.slots.map((slot) => ({
              start: slot.start.substring(0, 5),
              end: slot.end.substring(0, 5),
            })),
          };
        }
        return acc;
      },
      {} as Record<string, DaySchedule>,
    );

    console.log(convertedSchedule, "THIS IS CONVERTED SCHEDULE");

    // Ensure all days are present
    const finalSchedule = {
      "0": convertedSchedule["0"] || { isWorking: false, slots: [] },
      "1": convertedSchedule["1"] || { isWorking: false, slots: [] },
      "2": convertedSchedule["2"] || { isWorking: false, slots: [] },
      "3": convertedSchedule["3"] || { isWorking: false, slots: [] },
      "4": convertedSchedule["4"] || { isWorking: false, slots: [] },
      "5": convertedSchedule["5"] || { isWorking: false, slots: [] },
      "6": convertedSchedule["6"] || { isWorking: false, slots: [] },
    };

    // Update the barber's schedule in the database
    await db
      .update(barbers)
      .set({
        defaultWorkingHours: convertedSchedule,
      })
      .where(eq(barbers.id, Number(id)));

    return NextResponse.json(
      {
        message: "Schedule updated successfully",
        schedule: finalSchedule,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const weeklySchedule = await db
      .select()
      .from(barbers)
      .where(eq(barbers.id, Number(id)));

    if (!weeklySchedule.length) {
      return NextResponse.json({ error: "Barber not found" }, { status: 404 });
    }

    const storedSchedule = weeklySchedule[0].defaultWorkingHours;

    // Convert the stored ISO day schedule to calendar days
    const convertedSchedule = Object.entries(storedSchedule ?? {}).reduce(
      (acc, [day, schedule]) => {
        const calendarDay = convertISODayToCalendarDay(parseInt(day));
        acc[calendarDay] = schedule;
        return acc;
      },
      {} as Record<string, DaySchedule>,
    );

    // Ensure all calendar days are present (0 = Monday to 6 = Sunday)
    const normalizedSchedule = {
      "0": convertedSchedule["0"] || { isWorking: false, slots: [] }, // Monday
      "1": convertedSchedule["1"] || { isWorking: false, slots: [] }, // Tuesday
      "2": convertedSchedule["2"] || { isWorking: false, slots: [] }, // Wednesday
      "3": convertedSchedule["3"] || { isWorking: false, slots: [] }, // Thursday
      "4": convertedSchedule["4"] || { isWorking: false, slots: [] }, // Friday
      "5": convertedSchedule["5"] || { isWorking: false, slots: [] }, // Saturday
      "6": convertedSchedule["6"] || { isWorking: false, slots: [] }, // Sunday
    };

    const exceptions = await db
      .select()
      .from(scheduleOverrides)
      .where(eq(scheduleOverrides.barberId, Number(id)));

    return NextResponse.json({
      defaultWorkingHours: normalizedSchedule,
      exceptions,
    });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 },
    );
  }
}

// export async function GET(
//   request: Request,
//   { params }: { params: { id: string } },
// ) {
//   const { id } = params;
//   try {
//     const weeklySchedule = await db
//       .select()
//       .from(barbers)
//       .where(eq(barbers.id, Number(id)));
//     console.log(weeklySchedule, "weeklySchedule from ROUTE");
//     const defaultWorkingHours = weeklySchedule[0].defaultWorkingHours;
//     const exceptions = await db
//       .select()
//       .from(scheduleOverrides)
//       .where(eq(scheduleOverrides.barberId, Number(id)));
//     console.log(defaultWorkingHours, exceptions);
//     return NextResponse.json({ defaultWorkingHours, exceptions });
//   } catch (error) {
//     console.error("Error fetching schedules:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch schedules" },
//       { status: 500 },
//     );
//   }
// }

// // Define the expected shape of time slots
// const TimeSlotSchema = z.object({
//   start: z.string(),
//   end: z.string(),
// });

// // Define the expected shape of a day's schedule
// const DayScheduleSchema = z.object({
//   isWorking: z.boolean(),
//   slots: z.array(TimeSlotSchema),
// });

// // Define the expected shape of the entire schedule
// const ScheduleSchema = z.object({
//   defaultWorkingHours: z.record(DayScheduleSchema),
// });

// export async function PUT(
//   request: Request,
//   { params }: { params: { id: string } },
// ) {
//   const { id } = params;

//   if (!id || isNaN(Number(id))) {
//     return NextResponse.json({ error: "Invalid barber ID" }, { status: 400 });
//   }

//   try {
//     const body = await request.json();

//     // Validate the request body against our schema
//     const parseResult = ScheduleSchema.safeParse(body);

//     if (!parseResult.success) {
//       return NextResponse.json(
//         { error: "Invalid schedule format", details: parseResult.error },
//         { status: 400 },
//       );
//     }

//     // Clean up the schedule data to only include numeric keys (0-6)
//     const cleanSchedule = Object.entries(parseResult.data.defaultWorkingHours)
//       .filter(([key]) => /^[0-6]$/.test(key))
//       .reduce(
//         (acc, [key, value]) => ({
//           ...acc,
//           [key]: value,
//         }),
//         {},
//       );

//     // Update the barber's schedule in the database
//     await db
//       .update(barbers)
//       .set({
//         defaultWorkingHours: cleanSchedule,
//       })
//       .where(eq(barbers.id, Number(id)));

//     return NextResponse.json(
//       { message: "Schedule updated successfully" },
//       { status: 200 },
//     );
//   } catch (error) {
//     console.error("Error updating schedule:", error);
//     return NextResponse.json(
//       { error: "Failed to update schedule" },
//       { status: 500 },
//     );
//   }
// }
