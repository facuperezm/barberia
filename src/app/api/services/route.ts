import { NextResponse } from "next/server";
import { getServices } from "@/lib/actions/actions";

export async function GET() {
  try {
    const result = await getServices();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.services);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 },
    );
  }
}
