"use server";

import { db } from "@/drizzle";
import { payments, appointments } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Creates a MercadoPago payment preference for an appointment
 * @param appointmentId - The appointment ID to create payment for
 * @returns Payment preference with init point URLs for checkout
 */
export async function createPaymentPreference(appointmentId: number) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/mercadopago/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ appointmentId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment preference');
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        id: data.id,
        initPoint: data.init_point,
        sandboxInitPoint: data.sandbox_init_point,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to create payment preference',
    };
  }
}

/**
 * Retrieves payment status and details for an appointment
 * @param appointmentId - The appointment ID to check payment for
 * @returns Payment status, method, amount, and MercadoPago details
 */
export async function getPaymentStatus(appointmentId: number) {
  try {
    const payment = await db
      .select()
      .from(payments)
      .where(eq(payments.appointmentId, appointmentId))
      .limit(1);

    if (!payment.length) {
      return { success: false, error: 'Payment not found' };
    }

    return {
      success: true,
      data: {
        status: payment[0]!.status,
        method: payment[0]!.method,
        amount: payment[0]!.amountCents,
        mercadopagoPaymentId: payment[0]!.mercadopagoPaymentId,
        mercadopagoStatusDetail: payment[0]!.mercadopagoStatusDetail,
        createdAt: payment[0]!.createdAt,
        updatedAt: payment[0]!.updatedAt,
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to fetch payment status' };
  }
}

/**
 * Handles successful payment by confirming the appointment
 * @param appointmentId - The appointment ID that was paid
 * @param _paymentId - Payment ID (currently unused, reserved for future use)
 * @returns Success status
 */
export async function handlePaymentSuccess(appointmentId: number, _paymentId?: string) {
  try {
    // Update appointment status to confirmed
    await db
      .update(appointments)
      .set({
        status: 'confirmed',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/appointments`);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to process payment success' };
  }
}

/**
 * Handles failed payment by cancelling the appointment
 * @param appointmentId - The appointment ID that failed payment
 * @returns Success status
 */
export async function handlePaymentFailure(appointmentId: number) {
  try {
    // Update appointment status to cancelled
    await db
      .update(appointments)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/appointments`);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to process payment failure' };
  }
} 