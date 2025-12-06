"use server";

import { scheduleOverrides } from "@/drizzle/schema";
import { db } from "@/drizzle";
import { barbers } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getCurrentSalonId } from "@/lib/salon-context";

interface ScheduleOverrideResponse {
  success: boolean;
  override?: typeof scheduleOverrides.$inferSelect;
  error?: string;
}

export async function saveScheduleOverride(data: {
  barberId: string;
  date: string;
  isWorkingDay: boolean;
  availableSlots: string[];
  reason: string;
}): Promise<ScheduleOverrideResponse> {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: "Unauthorized access." };
  }

  const { barberId, date, isWorkingDay, availableSlots, reason } = data;

  try {
    const salonId = await getCurrentSalonId();

    // Verify barber belongs to current salon
    const barber = await db
      .select()
      .from(barbers)
      .where(
        and(
          eq(barbers.id, parseInt(barberId)),
          eq(barbers.salonId, salonId),
        ),
      )
      .limit(1);

    if (barber.length === 0) {
      return { success: false, error: "Barber not found or access denied." };
    }

    const [override] = await db
      .insert(scheduleOverrides)
      .values({
        barberId: parseInt(barberId),
        date,
        isWorkingDay,
        availableSlots: availableSlots.map((slot) => ({
          start: slot.split("-")[0],
          end: slot.split("-")[1],
        })),
        reason,
      })
      .returning();

    return { success: true, override };
  } catch (error) {
    return { success: false, error: "Failed to save schedule override." };
  }
}
