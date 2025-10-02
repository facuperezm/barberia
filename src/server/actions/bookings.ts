"use server";

import { db } from "@/drizzle";
import { appointments, barbers, services } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeDate, sanitizeTime } from "@/lib/sanitize";

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
  appointmentId?: number;
  redirectUrl?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

/**
 * Creates a booking with validation and optional payment flow
 * @param input - Booking details including barber, service, customer info, and time slot
 * @returns Booking response with appointment ID and optional payment redirect URL
 */
export async function createBookingAction(
  input: BookingInput
): Promise<BookingResponse> {
  try {
    // Validate input
    const validatedData = bookingSchema.safeParse(input);
    
    if (!validatedData.success) {
      return {
        success: false,
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    const { barberId, serviceId, customerName, customerEmail, customerPhone, date, time } = validatedData.data;

    // Sanitize user inputs
    const sanitizedCustomerName = sanitizeText(customerName);
    const sanitizedCustomerEmail = sanitizeEmail(customerEmail);
    const sanitizedCustomerPhone = sanitizePhone(customerPhone);
    const sanitizedDate = sanitizeDate(date);
    const sanitizedTime = sanitizeTime(time);

    // Validate sanitized inputs
    if (!sanitizedCustomerName || !sanitizedCustomerEmail || !sanitizedCustomerPhone || !sanitizedDate || !sanitizedTime) {
      return {
        success: false,
        error: "Invalid input data. Please check your information.",
      };
    }

    // Format time to include seconds
    const formattedTime = sanitizedTime.includes(':') && sanitizedTime.split(':').length === 2 
      ? `${sanitizedTime}:00` 
      : sanitizedTime;

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Verify barber exists
      const [barber] = await tx
        .select()
        .from(barbers)
        .where(eq(barbers.id, barberId))
        .limit(1);

      if (!barber) {
        throw new Error("Selected barber not found");
      }

      // Verify service exists and get duration
      const [service] = await tx
        .select()
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1);

      if (!service) {
        throw new Error("Selected service not found");
      }

      // Check if time slot is available
      const existingAppointments = await tx
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.barberId, barberId),
            eq(appointments.date, sanitizedDate),
            eq(appointments.time, formattedTime),
            eq(appointments.status, "confirmed")
          )
        )
        .limit(1);

      if (existingAppointments.length > 0) {
        throw new Error("This time slot is no longer available");
      }

      // Create appointment
      const appointmentDateTime = new Date(`${sanitizedDate}T${formattedTime}`);
      const endDateTime = new Date(
        appointmentDateTime.getTime() + service.durationMinutes * 60000
      );

      const [appointment] = await tx
        .insert(appointments)
        .values({
          salonId: barber.salonId,
          barberId,
          serviceId,
          appointmentAt: appointmentDateTime,
          endTime: endDateTime,
          status: "pending",
          // Legacy fields for compatibility
          date: sanitizedDate,
          time: formattedTime,
          customerName: sanitizedCustomerName,
          customerEmail: sanitizedCustomerEmail,
          customerPhone: sanitizedCustomerPhone,
        })
        .returning({ id: appointments.id });

      return { appointment, service };
    });

    // If service requires payment, create payment preference
    if (result.service.priceCents && result.service.priceCents > 0) {
      // Create MercadoPago preference
      const paymentResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: result.appointment.id }),
      });

      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json();
        const redirectUrl = process.env.NODE_ENV === 'production' 
          ? paymentData.init_point 
          : paymentData.sandbox_init_point;

        return {
          success: true,
          appointmentId: result.appointment.id,
          redirectUrl,
        };
      }
    }

    // No payment required
    revalidatePath("/dashboard");
    revalidatePath("/book");

    return {
      success: true,
      appointmentId: result.appointment.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create booking",
    };
  }
}

/**
 * Checks availability for a barber on a specific date
 * @param barberId - ID of the barber
 * @param date - Date to check availability for (YYYY-MM-DD format)
 * @param _serviceId - Service ID (currently unused, reserved for future use)
 * @returns Available time slots
 */
export async function checkAvailabilityAction(
  barberId: number,
  date: string,
  _serviceId: number
) {
  try {
    // Implementation for checking availability
    // This would return available time slots
    await db.select()
      .from(appointments)
      .where(
        and(
          eq(appointments.barberId, barberId),
          eq(appointments.date, date),
          eq(appointments.status, "confirmed")
        )
      );

    // Logic to calculate available slots based on working hours
    // and existing appointments
    // TODO: Implement slot calculation logic
    
    return { success: true, slots: [] };
  } catch (error) {
    return { success: false, error: "Failed to check availability" };
  }
} 