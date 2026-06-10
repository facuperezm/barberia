import "server-only";
import { db } from "@/drizzle";
import { salons } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { requireOwner } from "@/lib/auth";

export async function getCurrentSalonId(): Promise<number> {
  await requireOwner();

  const [salon] = await db.select().from(salons).limit(1);
  if (!salon) {
    throw new Error("No salon configured");
  }
  return salon.id;
}

export async function validateSalonAccess(salonId: number): Promise<boolean> {
  try {
    const currentSalonId = await getCurrentSalonId();
    return currentSalonId === salonId;
  } catch {
    return false;
  }
}

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

  return { salonId, salon };
}
