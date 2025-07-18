"use server";
import { db } from "@/drizzle";
import { and, eq } from "drizzle-orm";
import {
  appointments,
  barbers,
  customers,
  services,
  type Appointment,
} from "@/drizzle/schema";
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
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  date: string | null;
  time: string | null;
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

      // Create proper timestamp from date and time
      const appointmentDateTime = new Date(`${formattedDate}T${formattedTime}`);
      const endDateTime = new Date(appointmentDateTime.getTime() + service[0].durationMinutes * 60000);

      const appointment = await tx
        .insert(appointments)
        .values({
          salonId: barber[0].salonId, // Add salon ID for proper scoping
          barberId,
          serviceId,
          appointmentAt: appointmentDateTime,
          endTime: endDateTime,
          status: "pending",
          // Legacy fields for backward compatibility
          date: formattedDate,
          time: formattedTime,
          customerName,
          customerEmail,
          customerPhone,
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
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        appointmentAt: appointments.appointmentAt,
        status: appointments.status,
        barber: barbers.name,
        service: services.name,
      })
      .from(appointments)
      .leftJoin(barbers, eq(appointments.barberId, barbers.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(customers, eq(appointments.customerId, customers.id));

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
      .set({ status: status as Appointment["status"] })
      .where(eq(appointments.id, id))
      .returning();

    return { success: true, appointment: updated };
  } catch (error) {
    console.error("Error updating appointment:", error);
    return { success: false, error: "Failed to update appointment" };
  }
}
