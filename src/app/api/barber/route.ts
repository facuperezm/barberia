import { NextResponse } from "next/server";
import { getBarbers } from "@/lib/actions/barbers";

export async function GET() {
  try {
    const result = await getBarbers();

    if (!result) {
      return NextResponse.json(
        { error: "Failed to fetch barbers" },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch barbers" },
      { status: 500 },
    );
  }
}
