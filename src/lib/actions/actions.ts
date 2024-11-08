import { db } from "@/db";
import { appointments, barbers, services } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Define a Zod schema for appointment validation
const appointmentSchema = z.object({
  barberId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10),
  date: z.string(),
  time: z.string(), // HH:mm:ss format
});

export async function createAppointment(appointmentData: {
  barberId: number;
  serviceId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  time: string;
}) {
  // Validate the input data using Zod
  const parsedData = appointmentSchema.safeParse(appointmentData);
  if (!parsedData.success) {
    console.error("Validation Error:", parsedData.error.format());
    return { success: false, error: "Invalid appointment data" };
  }

  try {
    // Ensure the barber exists
    const barberExists = await db
      .select()
      .from(barbers)
      .where(eq(barbers.id, appointmentData.barberId))
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
      .where(eq(services.id, appointmentData.serviceId))
      .limit(1)
      .then((res) => res.length > 0);
    if (!serviceExists) {
      return { success: false, error: "Selected service does not exist" };
    }

    // Format the date to 'YYYY-MM-DD'
    const formattedDate = appointmentData.date.split("T")[0];

    // Format the time to 'HH:mm:ss' if necessary
    let formattedTime = appointmentData.time;
    const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/; // HH:mm format
    if (timeRegex.test(appointmentData.time)) {
      formattedTime = `${appointmentData.time}:00`; // Append seconds if not present
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

export async function getBarbers() {
  try {
    const allBarbers = await db.select().from(barbers);
    return { success: true, barbers: allBarbers };
  } catch (error) {
    console.error("Error fetching barbers:", error);
    return { success: false, error: "Failed to fetch barbers" };
  }
}

export async function getServices() {
  try {
    const allServices = await db.select().from(services);
    return { success: true, services: allServices };
  } catch (error) {
    console.error("Error fetching services:", error);
    return { success: false, error: "Failed to fetch services" };
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
