"use server";

import { db } from "@/drizzle";
import { and, eq, sql } from "drizzle-orm";
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
import { getCurrentSalonId } from "@/lib/salon-context";

const appointmentSchema = z.object({
  barberId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(2),
  appointmentAt: z.date(), // Use proper date instead of separate date/time
  notes: z.string().optional(),
});

interface ActionResponse {
  success: boolean;
  appointment?: Appointment;
  error?: string;
  errors?: Record<string, string[]>;
}

export async function createAppointmentImproved(
  data: z.infer<typeof appointmentSchema>,
): Promise<ActionResponse> {
  const { userId } = await auth();
  
  if (!userId) {
    return { success: false, error: "Unauthorized access." };
  }

  const parsedData = appointmentSchema.safeParse(data);
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
    appointmentAt,
    notes,
  } = parsedData.data;

  try {
    // Get current salon context
    const salonId = await getCurrentSalonId();

    const insertedAppointment = await db.transaction(async (tx) => {
      // Verify barber belongs to current salon
      const barber = await tx
        .select()
        .from(barbers)
        .where(and(eq(barbers.id, barberId), eq(barbers.salonId, salonId)))
        .limit(1);

      if (barber.length === 0) {
        throw new Error("Selected barber does not exist in your salon.");
      }

      // Verify service belongs to current salon
      const service = await tx
        .select()
        .from(services)
        .where(and(eq(services.id, serviceId), eq(services.salonId, salonId)))
        .limit(1);

      if (service.length === 0) {
        throw new Error("Selected service does not exist in your salon.");
      }

      // Calculate end time based on service duration
      const endTime = new Date(appointmentAt.getTime() + service[0].durationMinutes * 60000);

      // Check for overlapping appointments using proper timestamp comparison
      const overlappingAppointments = await tx
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.salonId, salonId),
            eq(appointments.barberId, barberId),
            sql`${appointments.appointmentAt} < ${endTime} AND ${appointments.endTime} > ${appointmentAt}`,
          ),
        )
        .limit(1);

      if (overlappingAppointments.length > 0) {
        throw new Error("The selected time slot conflicts with an existing appointment.");
      }

      // Find or create customer
      let customer = await tx
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.email, customerEmail),
            eq(customers.salonId, salonId),
          ),
        )
        .limit(1);

      let customerId: number;
      if (customer.length === 0) {
        // Create new customer
        const [newCustomer] = await tx
          .insert(customers)
          .values({
            salonId,
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          })
          .returning();
        customerId = newCustomer.id;
      } else {
        customerId = customer[0].id;
        // Update customer info if needed
        await tx
          .update(customers)
          .set({
            name: customerName,
            phone: customerPhone,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customerId));
      }

      // Create appointment with proper schema
      const [appointment] = await tx
        .insert(appointments)
        .values({
          salonId,
          barberId,
          serviceId,
          customerId,
          appointmentAt,
          endTime,
          status: "pending",
          notes,
          // Legacy fields for backward compatibility
          date: appointmentAt.toISOString().split("T")[0],
          time: appointmentAt.toTimeString().split(" ")[0],
          customerName,
          customerEmail,
          customerPhone,
        })
        .returning();

      return appointment;
    });

    revalidatePath("/dashboard/appointments");
    revalidatePath("/book");

    return {
      success: true,
      appointment: insertedAppointment,
    };
  } catch (error) {
    console.error("Error creating appointment:", error);
    return {
      success: false,
      error:
        (error as Error).message ||
        "Failed to create appointment, please try again.",
    };
  }
}

export async function getAppointmentsImproved() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
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
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return { success: false, error: "Failed to fetch appointments" };
  }
}

export async function updateAppointmentStatusImproved(
  appointmentId: number,
  status: Appointment["status"],
) {
  const { userId } = await auth();
  
  if (!userId) {
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
      return { success: false, error: "Appointment not found or access denied." };
    }

    revalidatePath("/dashboard/appointments");
    return { success: true, appointment: updated };
  } catch (error) {
    console.error("Error updating appointment:", error);
    return { success: false, error: "Failed to update appointment" };
  }
}

// Legacy function for backward compatibility
export async function createAppointmentLegacy(
  formData: FormData,
): Promise<ActionResponse> {
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  
  // Convert legacy date/time format to proper Date object
  const appointmentAt = new Date(`${date}T${time}`);
  
  const data = {
    barberId: parseInt(formData.get("barberId") as string),
    serviceId: parseInt(formData.get("serviceId") as string),
    customerName: formData.get("customerName") as string,
    customerEmail: formData.get("customerEmail") as string,
    customerPhone: formData.get("customerPhone") as string,
    appointmentAt,
    notes: formData.get("notes") as string,
  };

  return createAppointmentImproved(data);
}