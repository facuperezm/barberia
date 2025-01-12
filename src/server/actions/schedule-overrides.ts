"use server";

import { scheduleOverrides } from "@/drizzle/schema";

import { db } from "@/drizzle";
import { barbers } from "@/drizzle/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function saveScheduleOverride(data: {
  barberId: string;
  date: string;
  isWorkingDay: boolean;
  availableSlots: string[];
  reason: string;
}) {
  const { barberId, date, isWorkingDay, availableSlots, reason } = data;
  console.log(data);
  // Check if barberId exists
  const barber = await db
    .select()
    .from(barbers)
    .where(eq(barbers.id, parseInt(barberId)))
    .limit(1);

  if (barber.length === 0) {
    throw new Error("Barber not found");
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

  return override;
}
