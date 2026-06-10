import "server-only";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { db } from "@/drizzle";
import { appointments, salons, services } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import { formatDate, formatTime, toArgentinaDate } from "@/lib/dates";

const client = new MercadoPagoConfig({
  accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
});

interface PreferenceResult {
  success: boolean;
  initPoint?: string;
  sandboxInitPoint?: string;
  error?: string;
}

/**
 * Create a MercadoPago checkout preference for an appointment.
 * Called server-side only (from the booking action) — never exposed as a route.
 */
export async function createPreferenceForAppointment(
  appointmentId: number,
): Promise<PreferenceResult> {
  const [row] = await db
    .select({
      appointment: appointments,
      service: services,
      salon: salons,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(salons, eq(appointments.salonId, salons.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!row) {
    return { success: false, error: "Appointment not found" };
  }

  const { appointment, service, salon } = row;

  if (!appointment.appointmentAt || !appointment.customerEmail) {
    return { success: false, error: "Appointment is missing booking data" };
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const localDate = toArgentinaDate(appointment.appointmentAt);

  const preference = new Preference(client);
  const result = await preference.create({
    body: {
      items: [
        {
          id: `appointment-${appointment.id}`,
          title: `${service.name} - ${salon.name}`,
          description: `Turno el ${formatDate(localDate, "full")} a las ${formatTime(localDate)}`,
          quantity: 1,
          unit_price: service.priceCents / 100,
          currency_id: "ARS",
        },
      ],
      payer: {
        name: appointment.customerName ?? undefined,
        email: appointment.customerEmail,
        phone: appointment.customerPhone
          ? { number: appointment.customerPhone }
          : undefined,
      },
      back_urls: {
        success: `${appUrl}/book/success?payment=approved&appointment=${appointment.publicId}`,
        failure: `${appUrl}/book/payment-failed?appointment=${appointment.publicId}`,
        pending: `${appUrl}/book/payment-pending?appointment=${appointment.publicId}`,
      },
      auto_return: "approved" as const,
      external_reference: `appointment-${appointment.id}`,
      notification_url: `${appUrl}/api/mercadopago/webhooks`,
      statement_descriptor: salon.name.substring(0, 22),
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
  });

  return {
    success: true,
    initPoint: result.init_point,
    sandboxInitPoint: result.sandbox_init_point,
  };
}
