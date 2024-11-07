import { db } from "@/db";
import { appointments, barbers, services } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function createAppointment(appointmentData: {
  barberId: number;
  serviceId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: Date;
  time: string;
}) {
  try {
    const [appointment] = await db
      .insert(appointments)
      .values({
        barberId: appointmentData.barberId,
        serviceId: appointmentData.serviceId,
        customerName: appointmentData.customerName,
        customerEmail: appointmentData.customerEmail,
        customerPhone: appointmentData.customerPhone,
        date: appointmentData.date.toISOString(), // Convert Date to string
        time: appointmentData.time,
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
