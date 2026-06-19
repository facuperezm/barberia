import "server-only";
import { db } from "@/drizzle";
import { appointments, barbers, payments, services } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { sendAppointmentConfirmation } from "@/lib/email";
import { formatTime, toArgentinaDate } from "@/lib/dates";
import { logger } from "@/lib/logger";
import { decidePaymentOutcome, mapMercadoPagoStatus } from "./payment-status";

/**
 * The subset of a MercadoPago payment object we persist/act on. Modelled
 * structurally (rather than importing the SDK's response type) so this stays
 * decoupled from SDK internal type paths.
 */
export interface MercadoPagoPaymentData {
  id?: string | number;
  external_reference?: string | null;
  status?: string;
  transaction_amount?: number | null;
  payment_method_id?: string | null;
  payment_type_id?: string | null;
  installments?: number | null;
  card?: { last_four_digits?: string | null } | null;
  payer?: { email?: string | null } | null;
  processing_mode?: string | null;
  operation_type?: string | null;
  transaction_details?: unknown;
  status_detail?: string | null;
  order?: { id?: string | number | null } | null;
}

/**
 * Persist a MercadoPago payment and reconcile the linked appointment's status.
 * Idempotent and safe to call from both the webhook and the success-page
 * reconciliation fallback — the payment record is upserted (with terminal-status
 * downgrade protection) and the appointment is confirmed/cancelled per
 * `decidePaymentOutcome`. The confirmation email is sent at most once.
 */
export async function applyMercadoPagoPayment(
  paymentData: MercadoPagoPaymentData,
): Promise<void> {
  const externalReference = paymentData.external_reference;
  if (!externalReference || !externalReference.startsWith("appointment-")) {
    logger.warn("Payment with unknown external reference", {
      paymentId: paymentData.id,
      externalReference,
    });
    return;
  }

  const appointmentId = parseInt(externalReference.replace("appointment-", ""));
  const paymentId = String(paymentData.id ?? "");

  const [appointmentRow] = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      appointmentAt: appointments.appointmentAt,
      customerName: appointments.customerName,
      customerEmail: appointments.customerEmail,
      servicePriceCents: services.priceCents,
      serviceName: services.name,
      barberName: barbers.name,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appointmentRow) {
    logger.warn("Payment for unknown appointment", { paymentId, appointmentId });
    return;
  }

  const paymentStatus = mapMercadoPagoStatus(paymentData.status);
  const amountCents = Math.round((paymentData.transaction_amount || 0) * 100);

  // Upsert the payment record
  const [existingPayment] = await db
    .select({ id: payments.id, status: payments.status })
    .from(payments)
    .where(eq(payments.mercadopagoPaymentId, paymentId))
    .limit(1);

  // Never let an out-of-order pending/processing notification downgrade a
  // terminal payment status (succeeded/refunded)
  const isDowngrade =
    existingPayment &&
    (existingPayment.status === "succeeded" ||
      existingPayment.status === "refunded") &&
    (paymentStatus === "pending" || paymentStatus === "processing");
  const effectiveStatus = isDowngrade ? existingPayment.status : paymentStatus;

  const paymentFields = {
    status: effectiveStatus,
    mercadopagoPaymentMethodId: paymentData.payment_method_id ?? null,
    mercadopagoPaymentType: paymentData.payment_type_id ?? null,
    mercadopagoInstallments: paymentData.installments ?? null,
    mercadopagoCardLastFourDigits: paymentData.card?.last_four_digits ?? null,
    mercadopagoPayerEmail: paymentData.payer?.email ?? null,
    mercadopagoProcessingMode: paymentData.processing_mode ?? null,
    mercadopagoOperationType: paymentData.operation_type ?? null,
    mercadopagoTransactionDetails: paymentData.transaction_details ?? null,
    mercadopagoStatusDetail: paymentData.status_detail ?? null,
    mercadopagoFailureReason:
      paymentData.status === "rejected"
        ? (paymentData.status_detail ?? null)
        : null,
    updatedAt: new Date(),
  };

  if (existingPayment) {
    await db
      .update(payments)
      .set(paymentFields)
      .where(eq(payments.id, existingPayment.id));
  } else {
    await db.insert(payments).values({
      appointmentId,
      amountCents,
      method: "mercadopago",
      mercadopagoPaymentId: paymentId,
      mercadopagoPreferenceId: paymentData.order?.id?.toString() ?? null,
      mercadopagoExternalReference: externalReference,
      ...paymentFields,
    });
  }

  // TODO Phase 1: handle "refunded"/"charged_back" — currently only the payment
  // record reflects the refund; the appointment stays confirmed and must be
  // reconciled manually from the dashboard.
  const outcome = decidePaymentOutcome({
    paymentStatus,
    amountCents,
    servicePriceCents: appointmentRow.servicePriceCents,
    appointmentStatus: appointmentRow.status,
  });

  if (outcome === "amount_mismatch") {
    logger.error(
      "Payment amount mismatch — not confirming appointment",
      undefined,
      {
        paymentId,
        appointmentId,
        amountCents,
        expected: appointmentRow.servicePriceCents,
      },
    );
    return;
  }

  if (outcome === "confirm") {
    const wasAlreadyConfirmed = appointmentRow.status === "confirmed";

    await db
      .update(appointments)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId));

    if (
      !wasAlreadyConfirmed &&
      appointmentRow.customerEmail &&
      appointmentRow.appointmentAt
    ) {
      try {
        await sendAppointmentConfirmation({
          customerName: appointmentRow.customerName ?? "Cliente",
          customerEmail: appointmentRow.customerEmail,
          date: appointmentRow.appointmentAt,
          time: formatTime(toArgentinaDate(appointmentRow.appointmentAt)),
          service: appointmentRow.serviceName,
          barberName: appointmentRow.barberName,
        });
      } catch (error) {
        // Don't fail over email — the payment is already recorded
        logger.error("Failed to send confirmation email", error as Error, {
          appointmentId,
        });
      }
    }
  } else if (outcome === "cancel") {
    await db
      .update(appointments)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId));
  }
}
