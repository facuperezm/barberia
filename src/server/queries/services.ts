"use server";
import { db } from "@/drizzle";
import { eq } from "drizzle-orm";
import { services } from "@/drizzle/schema";
import { type Service } from "@/lib/types";

export async function getServices(): Promise<Service[]> {
  try {
    const allServices = await db.select().from(services);
    return allServices as Service[];
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
}

export async function updateServicePrice(formData: FormData) {
  return db
    .update(services)
    .set({ price: Number(formData.get("price")) })
    .where(eq(services.id, Number(formData.get("serviceId"))));
}
