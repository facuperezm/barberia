"use server";

import { db } from "@/drizzle";
import { appointments, barbers, customers, services } from "@/drizzle/schema";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeDate,
  sanitizeTime,
} from "@/lib/sanitize";
import { parseDateTime, now, formatTime, toArgentinaDate } from "@/lib/dates";
import { createPreferenceForAppointment } from "@/server/payments/mercadopago";
import { sendAppointmentConfirmation } from "@/lib/email";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const bookingSchema = z.object({
  barberId: z.number().int().positive("Please select a barber"),
  serviceId: z.number().int().positive("Please select a service"),
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerEmail: z.string().email("Please enter a valid email"),
  customerPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  time: z.string().regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
});

export type BookingInput = z.infer<typeof bookingSchema>;

interface BookingResponse {
  success: boolean;
  publicId?: string;
  redirectUrl?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

const NON_BLOCKING_STATUSES = ["cancelled", "no_show"] as const;

class BookingError extends Error {}

export async function createBookingAction(
  input: BookingInput,
): Promise<BookingResponse> {
  try {
    const requestHeaders = await headers();
    const clientIp =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rateLimitResult = await rateLimit(`booking:${clientIp}`, {
      maxRequests: 5,
      windowSeconds: 60,
    });

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: "Too many booking attempts. Please wait a minute and try again.",
      };
    }

    const validatedData = bookingSchema.safeParse(input);

    if (!validatedData.success) {
      return {
        success: false,
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    const { barberId, serviceId, date, time } = validatedData.data;

    const customerName = sanitizeText(validatedData.data.customerName);
    const customerEmail = sanitizeEmail(validatedData.data.customerEmail);
    const customerPhone = sanitizePhone(validatedData.data.customerPhone);
    const sanitizedDate = sanitizeDate(date);
    const sanitizedTime = sanitizeTime(time);

    if (
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !sanitizedDate ||
      !sanitizedTime
    ) {
      return {
        success: false,
        error: "Invalid input data. Please check your information.",
      };
    }

    // Interpret the requested slot as Argentina wall time
    const appointmentDateTime = parseDateTime(sanitizedDate, sanitizedTime);

    if (appointmentDateTime.getTime() <= now().getTime()) {
      return { success: false, error: "Cannot book a time in the past" };
    }

    const result = await db.transaction(async (tx) => {
      const [barber] = await tx
        .select()
        .from(barbers)
        .where(and(eq(barbers.id, barberId), eq(barbers.isActive, true)))
        .limit(1);

      if (!barber) {
        throw new BookingError("Selected barber not found");
      }

      const [service] = await tx
        .select()
        .from(services)
        .where(
          and(
            eq(services.id, serviceId),
            eq(services.salonId, barber.salonId),
            eq(services.isActive, true),
          ),
        )
        .limit(1);

      if (!service) {
        throw new BookingError("Selected service not found");
      }

      const endDateTime = new Date(
        appointmentDateTime.getTime() + service.durationMinutes * 60000,
      );

      // Range-overlap check against any non-cancelled appointment.
      // The DB exclusion constraint is the real guarantee under concurrency;
      // this check exists to give a friendlier error message.
      const [conflict] = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.barberId, barberId),
            notInArray(appointments.status, [...NON_BLOCKING_STATUSES]),
            sql`${appointments.appointmentAt} < ${endDateTime} AND ${appointments.endTime} > ${appointmentDateTime}`,
          ),
        )
        .limit(1);

      if (conflict) {
        throw new BookingError("This time slot is no longer available");
      }

      // Find or create the customer record
      const [existingCustomer] = await tx
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.email, customerEmail),
            eq(customers.salonId, barber.salonId),
          ),
        )
        .limit(1);

      let customerId: number;
      if (existingCustomer) {
        customerId = existingCustomer.id;
        await tx
          .update(customers)
          .set({
            name: customerName,
            phone: customerPhone,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customerId));
      } else {
        const [newCustomer] = await tx
          .insert(customers)
          .values({
            salonId: barber.salonId,
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          })
          .returning({ id: customers.id });
        customerId = newCustomer.id;
      }

      const [appointment] = await tx
        .insert(appointments)
        .values({
          salonId: barber.salonId,
          barberId,
          serviceId,
          customerId,
          appointmentAt: appointmentDateTime,
          endTime: endDateTime,
          // Paid bookings are confirmed by the payment webhook; free ones immediately
          status: service.priceCents > 0 ? "pending" : "confirmed",
          // Legacy fields kept until the Phase 1 schema migration
          date: sanitizedDate,
          time: `${sanitizedTime}:00`,
          customerName,
          customerEmail,
          customerPhone,
        })
        .returning({ id: appointments.id, publicId: appointments.publicId });

      return { appointment, service, barber };
    });

    revalidatePath("/dashboard");
    revalidatePath("/book");

    if (result.service.priceCents > 0) {
      const preference = await createPreferenceForAppointment(
        result.appointment.id,
      );

      if (!preference.success) {
        logger.error("Failed to create payment preference", undefined, {
          appointmentId: result.appointment.id,
        });
        return {
          success: false,
          error: "Could not start the payment. Please try again.",
        };
      }

      return {
        success: true,
        publicId: result.appointment.publicId,
        redirectUrl:
          process.env.NODE_ENV === "production"
            ? preference.initPoint
            : preference.sandboxInitPoint,
      };
    }

    // Free service: send confirmation email (failure must not fail the booking)
    try {
      await sendAppointmentConfirmation({
        customerName,
        customerEmail,
        date: appointmentDateTime,
        time: formatTime(toArgentinaDate(appointmentDateTime)),
        service: result.service.name,
        barberName: result.barber.name,
      });
    } catch (error) {
      logger.error("Failed to send confirmation email", error as Error, {
        appointmentId: result.appointment.id,
      });
    }

    return { success: true, publicId: result.appointment.publicId };
  } catch (error) {
    if (error instanceof BookingError) {
      return { success: false, error: error.message };
    }
    // 23P01 = exclusion_violation from the no-double-booking constraint
    if (isPgError(error, "23P01")) {
      return { success: false, error: "This time slot is no longer available" };
    }
    logger.error("Booking creation failed", error as Error);
    return { success: false, error: "Failed to create booking" };
  }
}

function isPgError(error: unknown, code: string): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === code || candidate.cause?.code === code;
}
