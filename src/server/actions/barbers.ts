"use server";

import { db } from "@/drizzle";
import { barbers, workingHours, salons } from "@/drizzle/schema";
import { asc, eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { type Barber } from "@/drizzle/schema";
import { getCurrentSalonId } from "@/lib/salon-context";

const barberSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Invalid email address."),
  phone: z.string().optional(),
  imageUrl: z.string().url("Invalid URL format.").optional(),
});

interface ActionResponse {
  success: boolean;
  barber?: Barber;
  error?: string;
  errors?: Record<string, string[]>;
}

export async function deleteBarberWithResponse(
  formData: FormData,
): Promise<ActionResponse> {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: "Unauthorized access." };
  }

  const id = formData.get("id");

  if (typeof id !== "string" || isNaN(parseInt(id))) {
    return { success: false, error: "Invalid barber ID." };
  }

  try {
    const salonId = await getCurrentSalonId();
    const deleteResult = await db
      .delete(barbers)
      .where(
        and(
          eq(barbers.id, parseInt(id)),
          eq(barbers.salonId, salonId),
        ),
      )
      .returning();

    if (deleteResult.length === 0) {
      return { success: false, error: "Barber not found or access denied." };
    }

    revalidatePath("/dashboard/barbers");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete barber." };
  }
}

// Form action wrapper for React 19.2 compatibility (must return void)
export async function deleteBarber(formData: FormData): Promise<void> {
  await deleteBarberWithResponse(formData);
}

export async function addBarber(state: unknown, formData: FormData) {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: "Unauthorized access." };
  }

  const inputValidation = barberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    imageUrl: formData.get("imageUrl"),
  });

  if (!inputValidation.success) {
    // Return errors to the client
    const { fieldErrors } = inputValidation.error.flatten();
    return { errors: fieldErrors };
  }

  const { name, email, phone, imageUrl } = inputValidation.data;

  try {
    // Get current salon context
    const salonId = await getCurrentSalonId();

    const newBarber = await db
      .insert(barbers)
      .values({
        salonId, // Add salon scoping
        name: name as string,
        email: email as string,
        phone: phone as string,
        imageUrl: imageUrl as string,
      })
      .returning();
    revalidatePath("/dashboard/barbers");
    return { success: true, barber: newBarber };
  } catch {
    return { success: false, error: "Failed to add barber." };
  }
}

export async function getBarbers(): Promise<Barber[]> {
  try {
    const salonId = await getCurrentSalonId();
    const allBarbers = await db
      .select()
      .from(barbers)
      .where(eq(barbers.salonId, salonId));
    return allBarbers as Barber[];
  } catch {
    return [];
  }
}

/**
 * Get barbers for public booking page (no auth required)
 * Returns active barbers from the default salon
 */
export async function getPublicBarbers(): Promise<Barber[]> {
  try {
    const [defaultSalon] = await db
      .select()
      .from(salons)
      .limit(1);

    if (!defaultSalon) {
      return [];
    }

    const allBarbers = await db
      .select()
      .from(barbers)
      .where(
        and(
          eq(barbers.salonId, defaultSalon.id),
          eq(barbers.isActive, true)
        )
      )
      .orderBy(asc(barbers.name));

    return allBarbers;
  } catch {
    return [];
  }
}

export async function getAllEmployees(): Promise<Barber[]> {
  try {
    const salonId = await getCurrentSalonId();
    const result = await db
      .select()
      .from(barbers)
      .where(eq(barbers.salonId, salonId))
      .orderBy(asc(barbers.name));
    return result;
  } catch {
    return [];
  }
}

export async function getBarberSchedule(barberId: number) {
  const result = await db
    .select()
    .from(workingHours)
    .where(eq(workingHours.barberId, barberId));

  return result;
}

export async function updateBarberSchedule(
  barberId: number,
  schedule: Record<
    number,
    { isWorking: boolean; slots: { start: string; end: string }[] }
  >,
) {
  const valuesToInsert = Object.entries(schedule).map(
    ([dayOfWeek, daySchedule]) => ({
      barberId,
      dayOfWeek: Number(dayOfWeek),
      isWorking: daySchedule.isWorking,
      startTime:
        daySchedule.isWorking && daySchedule.slots.length > 0
          ? daySchedule.slots[0].start
          : "09:00",
      endTime:
        daySchedule.isWorking && daySchedule.slots.length > 0
          ? daySchedule.slots[0].end
          : "17:00",
    }),
  );

  if (valuesToInsert.length === 0) {
    return { success: false, error: "No schedule data provided" };
  }

  await db.transaction(async (tx) => {
    await tx.delete(workingHours).where(eq(workingHours.barberId, barberId));
    await tx.insert(workingHours).values(valuesToInsert);
  });

  revalidatePath("/dashboard/employees");
  return { success: true };
}
