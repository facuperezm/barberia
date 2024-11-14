import { NextResponse } from "next/server";
import { db } from "@/drizzle";
import { eq } from "drizzle-orm";
import { barbers, scheduleOverrides } from "@/drizzle/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ barberId: string }> },
) {
  const { barberId } = await params;

  try {
    const weeklySchedule = await db
      .select()
      .from(barbers)
      .where(eq(barbers.id, Number(barberId)));

    const exceptions = await db
      .select()
      .from(scheduleOverrides)
      .where(eq(scheduleOverrides.barberId, Number(barberId)));

    return NextResponse.json({ weeklySchedule, exceptions });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 },
    );
  }
}
