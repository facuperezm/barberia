import { appointments } from "@/db/schema";

import { db } from "@/db";
import { eq } from "drizzle-orm";
import { barbers, services } from "@/db/schema";
import { z } from "zod";

const appointmentSchema = z.object({
  barberId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10),
  date: z.string(),
  time: z.string(), // HH:mm:ss format
});

export async function createAppointment(formData: FormData) {
  // Validate the input data using Zod
  const parsedData = appointmentSchema.safeParse(formData);
  if (!parsedData.success) {
    console.error("Validation Error:", parsedData.error.format());
    return { success: false, error: "Invalid appointment data" };
  }

  try {
    // Ensure the barber exists
    const barberExists = await db
      .select()
      .from(barbers)
      .where(eq(barbers.id, parsedData.data.barberId))
      .limit(1);
    // .then((res) => res.length > 0);
    console.log(barberExists, "barberExists");
    if (!barberExists) {
      return { success: false, error: "Selected barber does not exist" };
    }

    // Ensure the service exists
    const serviceExists = await db
      .select()
      .from(services)
      .where(eq(services.id, parsedData.data.serviceId))
      .limit(1)
      .then((res) => res.length > 0);
    if (!serviceExists) {
      return { success: false, error: "Selected service does not exist" };
    }

    // Format the date to 'YYYY-MM-DD'
    const formattedDate = parsedData.data.date.split("T")[0];

    // Format the time to 'HH:mm:ss' if necessary
    let formattedTime = parsedData.data.time;
    const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/; // HH:mm format
    if (timeRegex.test(parsedData.data.time)) {
      formattedTime = `${parsedData.data.time}:00`; // Append seconds if not present
    }

    console.log(formattedDate, formattedTime);

    const [appointment] = await db
      .insert(appointments)
      .values({
        barberId: parsedData.data.barberId,
        serviceId: parsedData.data.serviceId,
        customerName: parsedData.data.customerName,
        customerEmail: parsedData.data.customerEmail,
        customerPhone: parsedData.data.customerPhone,
        date: formattedDate, // Use formatted date
        time: formattedTime, // Use formatted time
        status: "pending",
      })
      .returning();

    return { success: true, appointment };
  } catch (error) {
    console.error("Error creating appointment:", error);
    return { success: false, error: "Failed to create appointment" };
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
