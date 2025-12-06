import { db } from "@/drizzle";
import { appointments, barbers, services, customers } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function getAppointments(salonId: number) {
  try {
    return await db
      .select({
        id: appointments.id,
        salonId: appointments.salonId,
        barberId: appointments.barberId,
        serviceId: appointments.serviceId,
        customerId: appointments.customerId,
        appointmentAt: appointments.appointmentAt,
        endTime: appointments.endTime,
        status: appointments.status,
        notes: appointments.notes,
        date: appointments.date,
        time: appointments.time,
        customerName: appointments.customerName,
        customerEmail: appointments.customerEmail,
        customerPhone: appointments.customerPhone,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        // Include related data
        barberName: barbers.name,
        serviceName: services.name,
        serviceDuration: services.durationMinutes,
        customerFullName: customers.name,
      })
      .from(appointments)
      .leftJoin(barbers, eq(appointments.barberId, barbers.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .where(eq(appointments.salonId, salonId));
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return [];
  }
}
