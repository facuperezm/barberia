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
import { isOwner } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getCurrentSalonId } from "@/lib/salon-context";

/**
 * Retrieves all appointments for current salon with related data
 */
export async function getAppointments() {
  try {
    if (!(await isOwner())) {
      return { success: false, error: "Unauthorized access." };
    }

    const salonId = await getCurrentSalonId();

    const allAppointments = await db
      .select({
        id: appointments.id,
        appointmentAt: appointments.appointmentAt,
        endTime: appointments.endTime,
        status: appointments.status,
        notes: appointments.notes,
        barberName: barbers.name,
        serviceName: services.name,
        serviceDuration: services.durationMinutes,
        servicePriceCents: services.priceCents,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
      })
      .from(appointments)
      .innerJoin(barbers, eq(appointments.barberId, barbers.id))
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .where(eq(appointments.salonId, salonId))
      .orderBy(appointments.appointmentAt);

    return { success: true, appointments: allAppointments };
  } catch {
    return { success: false, error: "Failed to fetch appointments" };
  }
}

const publicIdSchema = z.string().uuid();

/**
 * Get appointment details by public UUID (for the booking success page).
 * Uses the non-guessable publicId so appointment data can't be enumerated.
 */
export async function getPublicAppointmentByPublicId(publicId: string) {
  const parsed = publicIdSchema.safeParse(publicId);
  if (!parsed.success) {
    return { success: false as const, error: "Appointment not found" };
  }

  try {
    const [result] = await db
      .select({
        id: appointments.publicId,
        appointmentAt: appointments.appointmentAt,
        barberName: barbers.name,
        serviceName: services.name,
        customerName: appointments.customerName,
      })
      .from(appointments)
      .innerJoin(barbers, eq(appointments.barberId, barbers.id))
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.publicId, parsed.data))
      .limit(1);

    if (!result) {
      return { success: false as const, error: "Appointment not found" };
    }

    return { success: true as const, appointment: result };
  } catch {
    return { success: false as const, error: "Failed to fetch appointment" };
  }
}

/**
 * Updates appointment status with salon scoping
 */
export async function updateAppointmentStatus(
  appointmentId: number,
  status: Appointment["status"],
) {
  if (!(await isOwner())) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    const salonId = await getCurrentSalonId();

    const [updated] = await db
      .update(appointments)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.salonId, salonId),
        ),
      )
      .returning();

    if (!updated) {
      return {
        success: false,
        error: "Appointment not found or access denied.",
      };
    }

    revalidatePath("/dashboard/appointments");
    return { success: true, appointment: updated };
  } catch {
    return { success: false, error: "Failed to update appointment" };
  }
}
