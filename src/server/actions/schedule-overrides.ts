"use server";

import { scheduleOverrides, type ScheduleOverride } from "@/drizzle/schema";
import { db } from "@/drizzle";
import { barbers } from "@/drizzle/schema";
import { and, eq, gte, lte, asc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getCurrentSalonId } from "@/lib/salon-context";
import { revalidatePath } from "next/cache";

interface ScheduleOverrideResponse {
  success: boolean;
  override?: ScheduleOverride;
  error?: string;
}

interface ScheduleOverridesListResponse {
  success: boolean;
  overrides?: ScheduleOverride[];
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

    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/employees");
    return { success: true, override };
  } catch {
    return { success: false, error: "Failed to save schedule override." };
  }
}

export async function getScheduleOverrides(
  barberId: number,
  options?: { startDate?: string; endDate?: string },
): Promise<ScheduleOverridesListResponse> {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    const salonId = await getCurrentSalonId();

    // Verify barber belongs to current salon
    const barber = await db
      .select()
      .from(barbers)
      .where(and(eq(barbers.id, barberId), eq(barbers.salonId, salonId)))
      .limit(1);

    if (barber.length === 0) {
      return { success: false, error: "Barber not found or access denied." };
    }

    // Build query conditions
    const conditions = [eq(scheduleOverrides.barberId, barberId)];

    if (options?.startDate) {
      conditions.push(gte(scheduleOverrides.date, options.startDate));
    }

    if (options?.endDate) {
      conditions.push(lte(scheduleOverrides.date, options.endDate));
    }

    const overrides = await db
      .select()
      .from(scheduleOverrides)
      .where(and(...conditions))
      .orderBy(asc(scheduleOverrides.date));

    return { success: true, overrides };
  } catch {
    return { success: false, error: "Failed to fetch schedule overrides." };
  }
}

export async function deleteScheduleOverride(
  overrideId: number,
): Promise<ScheduleOverrideResponse> {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    const salonId = await getCurrentSalonId();

    // First get the override to verify it belongs to a barber in the current salon
    const [override] = await db
      .select()
      .from(scheduleOverrides)
      .where(eq(scheduleOverrides.id, overrideId))
      .limit(1);

    if (!override) {
      return { success: false, error: "Schedule override not found." };
    }

    // Verify barber belongs to current salon
    const barber = await db
      .select()
      .from(barbers)
      .where(
        and(eq(barbers.id, override.barberId), eq(barbers.salonId, salonId)),
      )
      .limit(1);

    if (barber.length === 0) {
      return { success: false, error: "Access denied." };
    }

    // Delete the override
    await db
      .delete(scheduleOverrides)
      .where(eq(scheduleOverrides.id, overrideId));

    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/employees");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete schedule override." };
  }
}

export async function updateScheduleOverride(
  overrideId: number,
  data: {
    isWorkingDay?: boolean;
    availableSlots?: string[];
    reason?: string;
  },
): Promise<ScheduleOverrideResponse> {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    const salonId = await getCurrentSalonId();

    // First get the override to verify it belongs to a barber in the current salon
    const [existingOverride] = await db
      .select()
      .from(scheduleOverrides)
      .where(eq(scheduleOverrides.id, overrideId))
      .limit(1);

    if (!existingOverride) {
      return { success: false, error: "Schedule override not found." };
    }

    // Verify barber belongs to current salon
    const barber = await db
      .select()
      .from(barbers)
      .where(
        and(
          eq(barbers.id, existingOverride.barberId),
          eq(barbers.salonId, salonId),
        ),
      )
      .limit(1);

    if (barber.length === 0) {
      return { success: false, error: "Access denied." };
    }

    const updateData: Partial<typeof scheduleOverrides.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.isWorkingDay !== undefined) {
      updateData.isWorkingDay = data.isWorkingDay;
    }

    if (data.availableSlots !== undefined) {
      updateData.availableSlots = data.availableSlots.map((slot) => ({
        start: slot.split("-")[0],
        end: slot.split("-")[1],
      }));
    }

    if (data.reason !== undefined) {
      updateData.reason = data.reason;
    }

    const [updatedOverride] = await db
      .update(scheduleOverrides)
      .set(updateData)
      .where(eq(scheduleOverrides.id, overrideId))
      .returning();

    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/employees");
    return { success: true, override: updatedOverride };
  } catch {
    return { success: false, error: "Failed to update schedule override." };
  }
}
