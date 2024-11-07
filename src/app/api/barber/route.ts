import { NextResponse } from "next/server";
import { getBarbers } from "@/lib/actions/actions";

export async function GET() {
  try {
    const result = await getBarbers();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.barbers);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch barbers" },
      { status: 500 },
    );
  }
}
