import { NextResponse } from "next/server";
import { db } from "@/drizzle";
import { barbers, scheduleOverrides } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { barberId, date, isWorkingDay, availableSlots, reason } = data;

    const parsedBarberId = parseInt(barberId);
    if (isNaN(parsedBarberId)) {
      return NextResponse.json(
        { error: "Invalid barberId. Must be a number." },
        { status: 400 },
      );
    }
    // Check if barberId exists
    const barber = await db
      .select()
      .from(barbers)
      .where(eq(barbers.id, parsedBarberId))
      .limit(1);

    if (barber.length === 0) {
      return NextResponse.json(
        { error: "Invalid barberId. Barber does not exist." },
        { status: 400 },
      );
    }

    const [override] = await db
      .insert(scheduleOverrides)
      .values({
        barberId: parsedBarberId,
        date,
        isWorkingDay,
        availableSlots,
        reason,
      })
      .returning();

    return NextResponse.json(override);
  } catch (error) {
    console.error("Error creating schedule override:", error);
    return NextResponse.json(
      { error: "Failed to create schedule override." },
      { status: 500 },
    );
  }
}
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get("barberId");
    const date = searchParams.get("date");

    if (!barberId) {
      return NextResponse.json(
        { error: "Barber ID is required" },
        { status: 400 },
      );
    }

    const overrides = await db
      .select()
      .from(scheduleOverrides)
      .where(
        and(
          eq(scheduleOverrides.barberId, parseInt(barberId)),
          eq(scheduleOverrides.date, date ?? ""),
        ),
      );

    return NextResponse.json(overrides);
  } catch (error) {
    console.error("Error fetching schedule overrides:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule overrides" },
      { status: 500 },
    );
  }
}
