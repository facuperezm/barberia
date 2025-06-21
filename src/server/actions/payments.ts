"use server";

import { db } from "@/drizzle";
import { payments, appointments } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
    console.error('Error creating payment preference:', error);
    return {
      success: false,
      error: 'Failed to create payment preference',
    };
  }
}

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
    console.error('Error fetching payment status:', error);
    return { success: false, error: 'Failed to fetch payment status' };
  }
}

export async function handlePaymentSuccess(appointmentId: number, paymentId?: string) {
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
    console.error('Error handling payment success:', error);
    return { success: false, error: 'Failed to process payment success' };
  }
}

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
    console.error('Error handling payment failure:', error);
    return { success: false, error: 'Failed to process payment failure' };
  }
} 