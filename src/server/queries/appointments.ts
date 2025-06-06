import { db } from "@/drizzle";
import { appointments } from "@/drizzle/schema";

export async function getAppointments() {
  return await db.select().from(appointments);
}
