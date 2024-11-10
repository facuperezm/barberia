import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");

    const data = await db
      .select()
      .from(appointments)
      .where(eq(appointments.barberId, Number(employeeId)));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const newAppointment = await request.json();
    const inserted = await db
      .insert(appointments)
      .values(newAppointment)
      .returning();

    // Here you can integrate email sending logic or other side effects

    return NextResponse.json(inserted);
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 },
    );
  }
}
