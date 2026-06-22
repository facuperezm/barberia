"use server";

import { db } from "@/drizzle";
import { barbers, workingHours, salons } from "@/drizzle/schema";
import { asc, eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type Barber } from "@/drizzle/schema";
import { requireSalonMember, getCurrentSalonId } from "@/lib/salon-context";

const barberSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Invalid email address."),
  phone: z.string().optional(),
  imageUrl: z.string().url("Invalid URL format.").optional(),
});

const updateBarberSchema = barberSchema.extend({
  id: z.number().positive("Invalid barber ID."),
  bio: z.string().optional(),
  isActive: z.boolean().optional(),
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
  let salonId: number;
  try {
    ({ salonId } = await requireSalonMember());
  } catch {
    return { success: false, error: "Unauthorized access." };
  }

  const id = formData.get("id");

  if (typeof id !== "string" || isNaN(parseInt(id))) {
    return { success: false, error: "Invalid barber ID." };
  }

  try {
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

    revalidatePath("/dashboard/team");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete barber." };
  }
}

export async function addBarber(state: unknown, formData: FormData) {
  let salonId: number;
  try {
    ({ salonId } = await requireSalonMember());
  } catch {
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
    revalidatePath("/dashboard/team");
    return { success: true, barber: newBarber };
  } catch {
    return { success: false, error: "Failed to add barber." };
  }
}

export async function updateBarber(data: {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  imageUrl?: string | null;
  bio?: string | null;
  isActive?: boolean;
}): Promise<ActionResponse> {
  let salonId: number;
  try {
    ({ salonId } = await requireSalonMember());
  } catch {
    return { success: false, error: "Unauthorized access." };
  }

  const inputValidation = updateBarberSchema.safeParse({
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone || undefined,
    imageUrl: data.imageUrl || undefined,
    bio: data.bio || undefined,
    isActive: data.isActive,
  });

  if (!inputValidation.success) {
    const { fieldErrors } = inputValidation.error.flatten();
    return { success: false, errors: fieldErrors };
  }

  const { id, name, email, phone, imageUrl, bio, isActive } =
    inputValidation.data;

  try {

    const [updatedBarber] = await db
      .update(barbers)
      .set({
        name,
        email,
        phone: phone ?? null,
        imageUrl: imageUrl ?? null,
        bio: bio ?? null,
        isActive: isActive ?? true,
        updatedAt: new Date(),
      })
      .where(and(eq(barbers.id, id), eq(barbers.salonId, salonId)))
      .returning();

    if (!updatedBarber) {
      return { success: false, error: "Barber not found or access denied." };
    }

    revalidatePath("/dashboard/team");
    return { success: true, barber: updatedBarber };
  } catch {
    return { success: false, error: "Failed to update barber." };
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
 * Resolve a salon by its URL slug (public, no auth required).
 */
export async function getPublicSalonBySlug(
  slug: string,
): Promise<{ id: number; name: string; slug: string } | null> {
  const [salon] = await db
    .select({ id: salons.id, name: salons.name, slug: salons.slug })
    .from(salons)
    .where(and(eq(salons.slug, slug), eq(salons.isActive, true)))
    .limit(1);
  return salon ?? null;
}

/**
 * Get barbers for public booking page (no auth required).
 * Scoped to the given salonId.
 */
export async function getPublicBarbers(salonId: number): Promise<Barber[]> {
  try {
    return await db
      .select()
      .from(barbers)
      .where(and(eq(barbers.salonId, salonId), eq(barbers.isActive, true)))
      .orderBy(asc(barbers.name));
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
  const salonId = await getCurrentSalonId();

  const [barber] = await db
    .select({ id: barbers.id })
    .from(barbers)
    .where(and(eq(barbers.id, barberId), eq(barbers.salonId, salonId)))
    .limit(1);

  if (!barber) {
    return [];
  }

  return db
    .select()
    .from(workingHours)
    .where(eq(workingHours.barberId, barberId));
}

export async function updateBarberSchedule(
  barberId: number,
  schedule: Record<
    number,
    { isWorking: boolean; slots: { start: string; end: string }[] }
  >,
) {
  const salonId = await getCurrentSalonId();

  const [barber] = await db
    .select({ id: barbers.id })
    .from(barbers)
    .where(and(eq(barbers.id, barberId), eq(barbers.salonId, salonId)))
    .limit(1);

  if (!barber) {
    return { success: false, error: "Barber not found or access denied" };
  }

  const valuesToInsert = Object.entries(schedule).map(
    ([dayOfWeek, daySchedule]) => {
      const slots = daySchedule.slots;
      const hasSlots = daySchedule.isWorking && slots.length > 0;

      return {
        barberId,
        dayOfWeek: Number(dayOfWeek),
        isWorking: daySchedule.isWorking,
        // Primary slot for backwards compatibility
        startTime: hasSlots ? slots[0].start : "09:00",
        endTime: hasSlots ? slots[0].end : "17:00",
        // All slots stored in JSONB for full fidelity
        availableSlots: hasSlots ? slots : null,
      };
    },
  );

  if (valuesToInsert.length === 0) {
    return { success: false, error: "No schedule data provided" };
  }

  await db.transaction(async (tx) => {
    await tx.delete(workingHours).where(eq(workingHours.barberId, barberId));
    await tx.insert(workingHours).values(valuesToInsert);
  });

  revalidatePath("/dashboard/team");
  return { success: true };
}
