import { getServices } from "@/server/queries/services";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await getServices();

    if (!result) {
      return NextResponse.json(
        { error: "Failed to fetch services" },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 },
    );
  }
}
