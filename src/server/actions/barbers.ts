"use server";

import { db } from "@/drizzle";
import { barbers, scheduleOverrides, workingHours } from "@/drizzle/schema";
import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type Barber } from "@/lib/types";
import { auth } from "@clerk/nextjs/server";

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

export interface Employee {
  id: number;
  name: string;
}

export async function deleteBarber(
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
    const deleteResult = await db
      .delete(barbers)
      .where(eq(barbers.id, parseInt(id)));

    if (deleteResult.count === 0) {
      return { success: false, error: "Barber not found." };
    }

    revalidatePath("/dashboard/barbers");
    return { success: true };
  } catch (error) {
    console.error("Error deleting barber:", error);
    return { success: false, error: "Failed to delete barber." };
  }
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
    const newBarber = await db
      .insert(barbers)
      .values({
        name: name as string,
        email: email as string,
        phone: phone as string,
        imageUrl: imageUrl as string,
      })
      .returning();
    revalidatePath("/dashboard/barbers");
    return { success: true, barber: newBarber };
  } catch (error) {
    console.error("Error adding barber:", error);
    return { success: false, error: "Failed to add barber." };
  }
}

export async function getBarbers(): Promise<Barber[]> {
  try {
    const allBarbers = await db.select().from(barbers);
    return allBarbers as Barber[];
  } catch (error) {
    console.error("Error fetching barbers:", error);
    return [];
  }
}

export async function getAllEmployees(): Promise<Employee[]> {
  const result = await db.select().from(barbers).orderBy(asc(barbers.name));
  return result.map((emp: typeof barbers.$inferSelect) => ({
    id: emp.id,
    name: emp.name,
  }));
}

export async function getBarberSchedule(barberId: number) {
  const result = await db
    .select()
    .from(workingHours)
    .where(eq(workingHours.barberId, barberId));

  return result;
}

// export async function getBarberScheduleById(barberId: number) {
//   const weeklySchedule = await db
//     .select()
//     .from(barbers)
//     .where(eq(barbers.id, Number(barberId)));

//   const exceptions = await db
//     .select()
//     .from(scheduleOverrides)
//     .where(eq(scheduleOverrides.barberId, Number(barberId)));

//   return { weeklySchedule, exceptions };
// }

export async function updateBarberSchedule(
  barberId: number,
  schedule: Record<
    number,
    { isWorking: boolean; slots: { start: string; end: string }[] }
  >,
) {
  await db.transaction(async (tx) => {
    const valuesToInsert = Object.entries(schedule).map(
      ([dayOfWeek, daySchedule]) => ({
        barberId,
        dayOfWeek: Number(dayOfWeek),
        isWorking: daySchedule.isWorking,
        startTime:
          daySchedule.isWorking && daySchedule.slots.length > 0
            ? daySchedule.slots[0].start
            : "9:00",
        endTime:
          daySchedule.isWorking && daySchedule.slots.length > 0
            ? daySchedule.slots[0].end
            : "17:00",
      }),
    );

    await tx.delete(workingHours).where(eq(workingHours.barberId, barberId));
    await tx.insert(workingHours).values(valuesToInsert);

    if (valuesToInsert.length === 0) {
      tx.rollback();
      return { success: false, error: "No values to insert" };
    }
  });
}
