"use server";
import { db } from "@/drizzle";
import { and, eq } from "drizzle-orm";
import { appointments, barbers, services } from "@/drizzle/schema";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const appointmentSchema = z.object({
  barberId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(2),
  date: z.string(),
  time: z.string(), // HH:mm:ss format
});

interface ActionResponse {
  success: boolean;
  appointment?: AppointmentResponse;
  error?: string;
  errors?: Record<string, string[]>;
}

interface AppointmentResponse {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  time: string;
  status: string | null;
}

export async function createAppointment(
  formData: FormData,
): Promise<ActionResponse> {
  const parsedData = appointmentSchema.safeParse(formData);

  if (!parsedData.success) {
    const { fieldErrors } = parsedData.error.flatten();
    return { success: false, errors: fieldErrors };
  }

  const {
    barberId,
    serviceId,
    customerName,
    customerEmail,
    customerPhone,
    date,
    time,
  } = parsedData.data;

  const formattedDate = date.split("T")[0];

  let formattedTime = time;
  const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/; // HH:mm format
  if (timeRegex.test(time)) {
    formattedTime = `${time}:00`; // Append seconds if not present
  }

  try {
    const insertedAppointment = await db.transaction(async (tx) => {
      const barber = await tx
        .select()
        .from(barbers)
        .where(eq(barbers.id, barberId))
        .limit(1);
      if (barber.length === 0) {
        throw new Error("Selected barber does not exist.");
      }

      const service = await tx
        .select()
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1);

      if (service.length === 0) {
        throw new Error("Selected service does not exist.");
      }

      // const selectedDate = new Date(formattedDate);
      // const dayOfWeek = selectedDate.toLocaleDateString("en-US", {
      //   weekday: "long",
      // });

      // const schedule = await tx
      //   .select()
      //   .from(schedules)
      //   .where(
      //     and(
      //       eq(schedules.barberId, barberId),
      //       eq(schedules.dayOfWeek, dayOfWeek),
      //     ),
      //   )
      //   .limit(1);

      // // Fetch any exceptions
      // const exception = await tx
      //   .select()
      //   .from(scheduleExceptions)
      //   .where(
      //     and(
      //       eq(scheduleExceptions.barberId, barberId),
      //       eq(scheduleExceptions.date, formattedDate),
      //     ),
      //   )
      //   .limit(1);

      // if (exception.length > 0) {
      //   if (!exception[0].isWorking) {
      //     throw new Error("Barber is not available on the selected date.");
      //   } else {
      //     // If working with specific hours
      //     if (exception[0].startTime && exception[0].endTime) {
      //       if (
      //         formattedTime < exception[0].startTime ||
      //         formattedTime > exception[0].endTime
      //       ) {
      //         throw new Error(
      //           "Selected time is outside the barber's available hours.",
      //         );
      //       }
      //     }
      //   }
      // } else if (schedule.length > 0) {
      //   // Check if the time is within regular schedule
      //   if (
      //     formattedTime < schedule[0].startTime! ||
      //     formattedTime > schedule[0].endTime!
      //   ) {
      //     throw new Error(
      //       "Selected time is outside the barber's regular working hours.",
      //     );
      //   }
      // } else {
      //   throw new Error(
      //     "Barber does not have a schedule for the selected day.",
      //   );
      // }

      // Check if the time slot is already booked
      const existingAppointment = await tx
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.barberId, barberId),
            eq(appointments.date, formattedDate),
            eq(appointments.time, formattedTime),
          ),
        )
        .limit(1);

      if (existingAppointment.length > 0) {
        throw new Error("The selected time slot is already booked.");
      }

      const appointment = await tx
        .insert(appointments)
        .values({
          barberId,
          serviceId,
          customerName,
          customerEmail,
          customerPhone,
          date: formattedDate,
          time: formattedTime,
          status: "pending",
        })
        .returning();

      return appointment[0];
    });

    revalidatePath("/dashboard/appointments");

    return {
      success: true,
      appointment: insertedAppointment,
    };
  } catch (error) {
    return {
      success: false,
      error:
        (error as Error).message ||
        "Failed to create appointment, please try once again.",
    };
  }
}

export async function getAppointments() {
  try {
    const allAppointments = await db
      .select({
        id: appointments.id,
        customerName: appointments.customerName,
        customerEmail: appointments.customerEmail,
        customerPhone: appointments.customerPhone,
        date: appointments.date,
        time: appointments.time,
        status: appointments.status,
        barber: barbers.name,
        service: services.name,
      })
      .from(appointments)
      .leftJoin(barbers, eq(appointments.barberId, barbers.id))
      .leftJoin(services, eq(appointments.serviceId, services.id));

    return { success: true, appointments: allAppointments };
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return { success: false, error: "Failed to fetch appointments" };
  }
}

export async function updateAppointmentStatus(id: number, status: string) {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    const [updated] = await db
      .update(appointments)
      .set({ status })
      .where(eq(appointments.id, id))
      .returning();

    return { success: true, appointment: updated };
  } catch (error) {
    console.error("Error updating appointment:", error);
    return { success: false, error: "Failed to update appointment" };
  }
}
