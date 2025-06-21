import { type NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { db } from "@/drizzle";
import { payments, appointments } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import crypto from "crypto";

// Initialize MercadoPago client
const client = new MercadoPagoConfig({
  accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
});

// Webhook signature validation (if secret is configured)
function validateWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return true; // Skip validation if no secret configured
  
  const parts = signature.split(',');
  let ts: string | null = null;
  let v1: string | null = null;

  parts.forEach(part => {
    const [key, value] = part.split('=');
    if (key?.trim() === 'ts') ts = value?.trim() || null;
    if (key?.trim() === 'v1') v1 = value?.trim() || null;
  });

  if (!ts || !v1) return false;

  // Create the manifest for validation
  const manifest = `ts:${ts};`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(manifest + body)
    .digest('hex');

  return expectedSignature === v1;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const data = JSON.parse(body);

    // Validate webhook signature if secret is configured
    const signature = request.headers.get('x-signature');
    if (env.MERCADOPAGO_WEBHOOK_SECRET && signature) {
      const isValid = validateWebhookSignature(
        body,
        signature,
        env.MERCADOPAGO_WEBHOOK_SECRET
      );
      
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Handle different webhook types
    if (data.type === 'payment') {
      await handlePaymentNotification(data.data.id);
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentNotification(paymentId: string) {
  try {
    // Fetch payment details from MercadoPago
    const payment = new Payment(client);
    const paymentData = await payment.get({ id: paymentId });

    if (!paymentData) {
      console.error(`Payment ${paymentId} not found`);
      return;
    }

    // Extract appointment ID from external reference
    const externalReference = paymentData.external_reference;
    if (!externalReference || !externalReference.startsWith('appointment-')) {
      console.error(`Invalid external reference: ${externalReference}`);
      return;
    }

    const appointmentId = parseInt(externalReference.replace('appointment-', ''));

    // Check if payment record already exists
    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.mercadopagoPaymentId, paymentId))
      .limit(1);

    const paymentStatus = mapMercadoPagoStatus(paymentData.status);
    const amountCents = Math.round((paymentData.transaction_amount || 0) * 100);

    if (existingPayment.length > 0) {
      // Update existing payment
      await db
        .update(payments)
        .set({
          status: paymentStatus,
          mercadopagoPaymentMethodId: paymentData.payment_method_id,
          mercadopagoPaymentType: paymentData.payment_type_id,
          mercadopagoInstallments: paymentData.installments,
          mercadopagoCardLastFourDigits: paymentData.card?.last_four_digits,
          mercadopagoPayerEmail: paymentData.payer?.email,
          mercadopagoProcessingMode: paymentData.processing_mode,
          mercadopagoOperationType: paymentData.operation_type,
          mercadopagoTransactionDetails: paymentData.transaction_details,
          mercadopagoStatusDetail: paymentData.status_detail,
          mercadopagoFailureReason: paymentData.status === 'rejected' 
            ? `${paymentData.status_detail} - ${paymentData.transaction_details?.verification_code}` 
            : null,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, existingPayment[0]!.id));
    } else {
      // Create new payment record
      await db.insert(payments).values({
        appointmentId,
        amountCents,
        method: 'mercadopago',
        status: paymentStatus,
        mercadopagoPaymentId: paymentId,
        mercadopagoPreferenceId: paymentData.order?.id?.toString() || null,
        mercadopagoPaymentMethodId: paymentData.payment_method_id || null,
        mercadopagoPaymentType: paymentData.payment_type_id || null,
        mercadopagoInstallments: paymentData.installments || null,
        mercadopagoCardLastFourDigits: paymentData.card?.last_four_digits || null,
        mercadopagoPayerEmail: paymentData.payer?.email || null,
        mercadopagoProcessingMode: paymentData.processing_mode || null,
        mercadopagoOperationType: paymentData.operation_type || null,
        mercadopagoExternalReference: externalReference,
        mercadopagoTransactionDetails: paymentData.transaction_details || null,
        mercadopagoStatusDetail: paymentData.status_detail || null,
        mercadopagoFailureReason: paymentData.status === 'rejected' 
          ? `${paymentData.status_detail} - ${paymentData.transaction_details?.verification_code}` 
          : null,
      });
    }

    // Update appointment status based on payment status
    if (paymentStatus === 'succeeded') {
      await db
        .update(appointments)
        .set({
          status: 'confirmed',
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, appointmentId));
    } else if (paymentStatus === 'failed') {
      await db
        .update(appointments)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, appointmentId));
    }

    console.log(`Payment ${paymentId} processed successfully`);

  } catch (error) {
    console.error(`Error processing payment ${paymentId}:`, error);
  }
}

function mapMercadoPagoStatus(status: string | undefined): 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' {
  switch (status) {
    case 'approved':
      return 'succeeded';
    case 'pending':
    case 'in_process':
      return 'processing';
    case 'rejected':
    case 'cancelled':
      return 'failed';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    default:
      return 'pending';
  }
} 