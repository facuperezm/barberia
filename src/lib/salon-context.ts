import "server-only";
import { db } from "@/drizzle";
import { salons } from "@/drizzle/schema";
import { requireOwner } from "@/lib/auth";

export async function getCurrentSalonId(): Promise<number> {
  await requireOwner();

  const [salon] = await db.select().from(salons).limit(1);
  if (!salon) {
    throw new Error("No salon configured");
  }
  return salon.id;
}
