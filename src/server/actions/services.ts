"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server"; // Assuming you're using Clerk for authentication
import { db } from "@/drizzle";
import { services } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

// Define the schema for updating service price
const updateServicePriceSchema = z.object({
  serviceId: z.string().regex(/^\d+$/, "Invalid Service ID."),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid decimal number."),
});

// Define the response type
interface ActionResponse {
  success: boolean;
  error?: string;
}

/**
 * Updates the price of a service (requires authentication)
 * @param formData - Form data containing serviceId and price
 * @returns Action response with success status
 */
export async function updateServicePrice(
  formData: FormData,
): Promise<ActionResponse> {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: "Unauthorized access." };
  }

  // Extract and validate form data
  const input = {
    serviceId: formData.get("serviceId"),
    price: formData.get("price"),
  };

  const parsed = updateServicePriceSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false };
  }

  try {
    const updated = await db
      .update(services)
      .set({ price: Number(parsed.data.price) })
      .where(eq(services.id, Number(parsed.data.serviceId)))
      .returning();

    if (!updated) {
      return { success: false, error: "Service not found." };
    }

    revalidatePath("/dashboard/services");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update service price." };
  }
}
