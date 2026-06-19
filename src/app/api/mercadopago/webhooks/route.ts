import { type NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { env } from "@/env";
import { verifyMercadoPagoSignature } from "@/server/payments/webhook-signature";
import { applyMercadoPagoPayment } from "@/server/payments/apply-payment";
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
    const payment = new Payment(getClient());
    const paymentData = await payment.get({ id: dataId });
    if (!paymentData) {
      throw new Error(`Payment ${dataId} not found in MercadoPago`);
    }
    await applyMercadoPagoPayment(paymentData);
    return NextResponse.json({ received: true });
  } catch (error) {
    // Return 500 so MercadoPago retries the notification
    logger.error("Webhook processing failed", error as Error, {
      paymentId: dataId,
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
