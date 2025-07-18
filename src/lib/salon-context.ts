"use server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/drizzle";
import { salons } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { env } from "@/env";

export async function getCurrentSalonId(): Promise<number> {
  const user = await currentUser()
  if (!user) {
    throw new Error("Unauthorized: No user session found");
  }

  const userEmail = user.emailAddresses[0].emailAddress;
  console.log(userEmail);
  if (userEmail === env.OWNER_EMAIL) {
    const [salon] = await db.select().from(salons).limit(1);
    if (!salon) {
      throw new Error("No salon found for owner");
    }
    return salon.id;
  }


  const [defaultSalon] = await db.select().from(salons).limit(1);
  if (!defaultSalon) {
    throw new Error("No default salon found");
  }
  
  return defaultSalon.id;
}

/**
 * Validate that a user has access to a specific salon
 */
export async function validateSalonAccess(salonId: number): Promise<boolean> {
  try {
    const currentSalonId = await getCurrentSalonId();
    return currentSalonId === salonId;
  } catch {
    return false;
  }
}

/**
 * Get salon context for the current user
 */
export async function getSalonContext() {
  const salonId = await getCurrentSalonId();
  const [salon] = await db
    .select()
    .from(salons)
    .where(eq(salons.id, salonId))
    .limit(1);

  if (!salon) {
    throw new Error(`Salon with ID ${salonId} not found`);
  }

  return {
    salonId,
    salon,
  };
}