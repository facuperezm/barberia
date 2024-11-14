import { db } from "@/drizzle";
import { eq } from "drizzle-orm";
import { services } from "@/drizzle/schema";

export async function getServices() {
  try {
    const allServices = await db.select().from(services);
    return allServices;
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
}

export function updateServicePrice(formData: FormData) {
  return db
    .update(services)
    .set({ price: Number(formData.get("price")) })
    .where(eq(services.id, Number(formData.get("serviceId"))));
}
