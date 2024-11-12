"use server";

import { db } from "@/db";
import { barbers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type Barber } from "@/lib/types";

const barberSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Invalid email address."),
  phone: z.string().optional(),
  imageUrl: z.string().url("Invalid URL format.").optional(),
});

export async function deleteBarber(formData: FormData) {
  const id = formData.get("id") as string;

  try {
    await db.delete(barbers).where(eq(barbers.id, parseInt(id)));
    revalidatePath("/dashboard/barbers");
    return { success: true };
  } catch (error) {
    console.error("Error deleting barber:", error);
    return { success: false, error: "Failed to delete barber" };
  }
}

export async function addBarber(state: unknown, formData: FormData) {
  // Validate form data using Zod
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
    throw new Error("Failed to add barber.");
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
