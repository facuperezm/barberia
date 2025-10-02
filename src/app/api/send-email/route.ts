import { NextResponse } from "next/server";
import { Resend } from "resend";
import AppointmentConfirmationEmail from "@/components/emails/reservation-confirmation";
import { env } from "@/env";
import { db } from "@/drizzle";
import { barbers } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { rateLimit, getClientIdentifier } from "@/lib/rate-limit";

const resend = new Resend(env.NEXT_PUBLIC_RESEND_API_KEY);

export async function POST(request: Request) {
  // Apply rate limiting: 5 emails per minute to prevent abuse
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(identifier, { maxRequests: 5, windowSeconds: 60 });

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many email requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { appointment, type } = await request.json();

    if (type === "confirmation") {
      const { customerName, start, barberId } = appointment;

      // Get service and barber details (replace with your actual data fetching)
      const service = "Haircut"; // Replace with actual service name
      const barberName = "John Doe"; // Replace with actual barber name

      const _barber = await db.query.barbers.findFirst({
        where: eq(barbers.id, barberId),
      });

      const date = new Date(start).toLocaleDateString();
      const time = new Date(start).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const data = await resend.emails.send({
        from: "Modern Barbershop <appointments@modern-barbershop.com>",
        to: ["customer@example.com"], // Replace with actual customer email
        subject: "Appointment Confirmation - Modern Barbershop",
        react: AppointmentConfirmationEmail({
          customerName,
          date,
          time,
          service,
          barberName,
        }),
      });

      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
