import { updateAppointmentStatus } from "@/lib/actions/actions";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { status } = await request.json();
    const result = await updateAppointmentStatus(parseInt(params.id), status);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.appointment);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 },
    );
  }
}
