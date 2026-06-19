"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/drizzle";
import { services } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { requireSalonMember } from "@/lib/salon-context";

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
async function updateServicePriceWithResponse(
  formData: FormData,
): Promise<ActionResponse> {
  let salonId: number;
  try {
    ({ salonId } = await requireSalonMember());
  } catch {
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
      .set({ priceCents: Math.round(Number(parsed.data.price) * 100) })
      .where(
        and(
          eq(services.id, Number(parsed.data.serviceId)),
          eq(services.salonId, salonId),
        ),
      )
      .returning();

    if (updated.length === 0) {
      return { success: false, error: "Service not found or access denied." };
    }

    revalidatePath("/dashboard/services");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update service price." };
  }
}

// Form action wrapper for React 19.2 compatibility (must return void)
export async function updateServicePrice(formData: FormData): Promise<void> {
  await updateServicePriceWithResponse(formData);
}
