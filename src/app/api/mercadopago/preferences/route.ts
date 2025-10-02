import { type NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { db } from "@/drizzle";
import { appointments, services, customers, salons } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { env } from "@/env";

// Initialize MercadoPago client
const client = new MercadoPagoConfig({
  accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointmentId } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "Appointment ID is required" },
        { status: 400 }
      );
    }

    // Fetch appointment details with related data
    const appointment = await db
      .select({
        appointment: appointments,
        service: services,
        customer: customers,
        salon: salons,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(salons, eq(appointments.salonId, salons.id))
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!appointment.length) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const { appointment: appt, service, customer, salon } = appointment[0];

    if (!service || !customer || !salon) {
      return NextResponse.json(
        { error: "Missing required appointment data" },
        { status: 400 }
      );
    }

    // Create the preference
    const preference = new Preference(client);

    const appointmentDate = appt.appointmentAt || new Date();
    const preferenceData = {
      items: [
        {
          id: `appointment-${appt.id}`,
          title: `${service.name} - ${salon.name}`,
          description: `Appointment on ${appointmentDate.toLocaleDateString()} at ${appointmentDate.toLocaleTimeString()}`,
          quantity: 1,
          unit_price: service.priceCents / 100, // Convert cents to currency
          currency_id: "ARS", // Adjust based on your country
        },
      ],
      payer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone ? { number: customer.phone } : undefined,
      },
      back_urls: {
        success: `${request.nextUrl.origin}/book/success?payment=approved&appointment=${appt.id}`,
        failure: `${request.nextUrl.origin}/book/payment-failed?appointment=${appt.id}`,
        pending: `${request.nextUrl.origin}/book/payment-pending?appointment=${appt.id}`,
      },
      auto_return: "approved" as const,
      external_reference: `appointment-${appt.id}`,
      notification_url: `${request.nextUrl.origin}/api/mercadopago/webhooks`,
      statement_descriptor: salon.name.substring(0, 22), // Max 22 characters
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    };

    const result = await preference.create({
      body: preferenceData,
    });

    return NextResponse.json({
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });

  } catch (error) {
    console.error("MercadoPago preference creation error:", error);
    return NextResponse.json(
      { error: "Failed to create payment preference" },
      { status: 500 }
    );
  }
} 