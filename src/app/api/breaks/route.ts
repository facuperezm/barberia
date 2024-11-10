import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // const data = await db.select().from(b  reaks).all();
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error fetching breaks:", error);
    return NextResponse.json(
      { error: "Failed to fetch breaks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // const newBreak = await request.json();
    // const inserted = await db.insert(breaks).values(newBreak).returning();
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error creating break:", error);
    return NextResponse.json(
      { error: "Failed to create break" },
      { status: 500 },
    );
  }
}
