"use server";

import { db } from "@/drizzle";
import { appointments, barbers, services } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";

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

    // Format time to include seconds
    const formattedTime = time.includes(':') && time.split(':').length === 2 
      ? `${time}:00` 
      : time;

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
            eq(appointments.date, date),
            eq(appointments.time, formattedTime),
            eq(appointments.status, "confirmed")
          )
        )
        .limit(1);

      if (existingAppointments.length > 0) {
        throw new Error("This time slot is no longer available");
      }

      // Create appointment
      const appointmentDateTime = new Date(`${date}T${formattedTime}`);
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
          date,
          time: formattedTime,
          customerName,
          customerEmail,
          customerPhone,
        })
        .returning({ id: appointments.id });

      return { appointment, service };
    });

    // If service requires payment, create payment preference
    if (result.service.price && result.service.price > 0) {
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
    console.error("Booking error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create booking",
    };
  }
}

export async function checkAvailabilityAction(
  barberId: number,
  date: string,
  serviceId: number
) {
  try {
    // Implementation for checking availability
    // This would return available time slots
    const availableSlots = await db.select()
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
    
    return { success: true, slots: [] };
  } catch (error) {
    console.error("Availability check error:", error);
    return { success: false, error: "Failed to check availability" };
  }
} 