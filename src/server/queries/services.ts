"use server";
import { db } from "@/drizzle";
import { services } from "@/drizzle/schema";
import { type Service } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

export async function getServices(salonId: number): Promise<Service[]> {
  try {
    return await db
      .select()
      .from(services)
      .where(eq(services.salonId, salonId));
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
}

export async function getPublicServices(salonId: number): Promise<Service[]> {
  try {
    return await db
      .select()
      .from(services)
      .where(and(eq(services.salonId, salonId), eq(services.isActive, true)));
  } catch (error) {
    console.error("Error fetching public services:", error);
    return [];
  }
}

// Note: Use updateServicePrice from @/server/actions/services.ts instead
// That version includes proper auth checks
