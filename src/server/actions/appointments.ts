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
import { revalidatePath } from "next/cache";
import { requireSalonMember } from "@/lib/salon-context";
import { reconcilePendingAppointment } from "@/server/payments/reconcile";
import { logger } from "@/lib/logger";

/**
 * Retrieves all appointments for current salon with related data
 */
export async function getAppointments() {
  let salonId: number;
  try {
    ({ salonId } = await requireSalonMember());
  } catch {
    return { success: false, error: "Unauthorized access." };
  }

  try {

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
 * Resolve a booking's details and current status by public UUID (for the
 * booking result page). Uses the non-guessable publicId so appointment data
 * can't be enumerated.
 *
 * If the booking is still `pending` (paid, but the payment webhook hasn't
 * landed yet), this reconciles directly against MercadoPago first, so the
 * customer sees an accurate status even when the webhook is delayed or lost.
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
        numericId: appointments.id,
        status: appointments.status,
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

    let status = result.status;

    // Webhook-loss fallback: verify the payment with MercadoPago and re-read.
    if (status === "pending") {
      try {
        await reconcilePendingAppointment(result.numericId);
        const [refreshed] = await db
          .select({ status: appointments.status })
          .from(appointments)
          .where(eq(appointments.id, result.numericId))
          .limit(1);
        if (refreshed) status = refreshed.status;
      } catch (error) {
        logger.error("Payment reconciliation failed", error as Error, {
          appointmentId: result.numericId,
        });
      }
    }

    const { numericId: _numericId, ...appointment } = result;
    return { success: true as const, appointment: { ...appointment, status } };
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
  let salonId: number;
  try {
    ({ salonId } = await requireSalonMember());
  } catch {
    return { success: false, error: "Unauthorized access." };
  }

  try {

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
