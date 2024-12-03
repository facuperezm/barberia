"use server";

import { db } from "@/drizzle";
import { barbers } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
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
