import { type NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { db } from "@/drizzle";
import { payments, appointments, barbers, services } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import { verifyMercadoPagoSignature } from "@/server/payments/webhook-signature";
import { sendAppointmentConfirmation } from "@/lib/email";
import { formatTime, toArgentinaDate } from "@/lib/dates";
import { logger } from "@/lib/logger";

let client: MercadoPagoConfig | undefined;

function getClient(): MercadoPagoConfig {
  client ??= new MercadoPagoConfig({
    accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
  });
  return client;
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  // MP sends data.id as a query param; fall back to the body
  let parsedBody: { type?: string; data?: { id?: string | number } } = {};
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dataId =
    request.nextUrl.searchParams.get("data.id") ??
    (parsedBody.data?.id != null ? String(parsedBody.data.id) : null);

  const isValid = verifyMercadoPagoSignature({
    signatureHeader: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
    secret: env.MERCADOPAGO_WEBHOOK_SECRET,
  });

  if (!isValid) {
    logger.warn("Rejected webhook with invalid signature", { dataId });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (parsedBody.type !== "payment" || !dataId) {
    // Not a payment event — acknowledge and ignore
    return NextResponse.json({ received: true });
  }

  try {
    await handlePaymentNotification(dataId);
    return NextResponse.json({ received: true });
  } catch (error) {
    // Return 500 so MercadoPago retries the notification
    logger.error("Webhook processing failed", error as Error, {
      paymentId: dataId,
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handlePaymentNotification(paymentId: string) {
  const payment = new Payment(getClient());
  const paymentData = await payment.get({ id: paymentId });

  if (!paymentData) {
    throw new Error(`Payment ${paymentId} not found in MercadoPago`);
  }

  const externalReference = paymentData.external_reference;
  if (!externalReference || !externalReference.startsWith("appointment-")) {
    logger.warn("Webhook payment with unknown external reference", {
      paymentId,
      externalReference,
    });
    return;
  }

  const appointmentId = parseInt(externalReference.replace("appointment-", ""));

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
    logger.warn("Webhook for unknown appointment", { paymentId, appointmentId });
    return;
  }

  const paymentStatus = mapMercadoPagoStatus(paymentData.status);
  const amountCents = Math.round((paymentData.transaction_amount || 0) * 100);

  // Upsert the payment record
  const [existingPayment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.mercadopagoPaymentId, paymentId))
    .limit(1);

  const paymentFields = {
    status: paymentStatus,
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
        ? paymentData.status_detail ?? null
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

  if (paymentStatus === "succeeded") {
    // Verify the paid amount covers the service price before confirming
    if (amountCents < appointmentRow.servicePriceCents) {
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
        // Don't fail the webhook over email — payment is already recorded
        logger.error("Failed to send confirmation email", error as Error, {
          appointmentId,
        });
      }
    }
  } else if (paymentStatus === "failed") {
    await db
      .update(appointments)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId));
  }
}

function mapMercadoPagoStatus(
  status: string | undefined,
): "pending" | "processing" | "succeeded" | "failed" | "refunded" {
  switch (status) {
    case "approved":
      return "succeeded";
    case "pending":
    case "in_process":
      return "processing";
    case "rejected":
    case "cancelled":
      return "failed";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}
