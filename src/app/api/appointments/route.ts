import { NextResponse } from "next/server";
import { createAppointment } from "@/server/actions/appointments";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result = await createAppointment(data);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.appointment);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 },
    );
  }
}
