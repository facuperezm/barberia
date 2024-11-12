import { NextResponse } from "next/server";
import { getWeeklySchedule } from "@/server/queries/schedule";
import { z } from "zod";

const QuerySchema = z.object({
  employeeId: z.string().regex(/^\d+$/, "Employee ID must be a number"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const parsed = QuerySchema.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const employeeId = Number(parsed.data.employeeId);

    const schedule = await getWeeklySchedule(employeeId);

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
