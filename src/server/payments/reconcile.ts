import "server-only";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { env } from "@/env";
import { applyMercadoPagoPayment } from "./apply-payment";

/**
 * Fallback for when a payment webhook is delayed or lost: look up the
 * appointment's payment(s) directly from MercadoPago and apply the result.
 * Called when a customer lands back on the success page while their booking is
 * still `pending`, so confirmation doesn't depend solely on webhook delivery.
 */
export async function reconcilePendingAppointment(
  appointmentId: number,
): Promise<void> {
  const client = new MercadoPagoConfig({
    accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
  });

  const search = await new Payment(client).search({
    options: { external_reference: `appointment-${appointmentId}` },
  });

  const results = search?.results ?? [];
  if (results.length === 0) return;

  // Prefer an approved payment; otherwise the most recently updated one.
  const approved = results.find((payment) => payment.status === "approved");
  const target =
    approved ??
    [...results].sort((a, b) =>
      (b.date_last_updated ?? "").localeCompare(a.date_last_updated ?? ""),
    )[0];

  if (target) {
    await applyMercadoPagoPayment(target);
  }
}
