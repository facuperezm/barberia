/**
 * Pure payment-decision logic shared by the MercadoPago webhook and the
 * success-page reconciliation fallback. Kept free of DB/SDK I/O so both paths
 * apply identical rules and the rules are unit-tested.
 */

export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded";

/** Normalize a raw MercadoPago payment status into our internal vocabulary. */
export function mapMercadoPagoStatus(status: string | undefined): PaymentStatus {
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

export type PaymentOutcome = "confirm" | "cancel" | "amount_mismatch" | "noop";

/**
 * Decide what should happen to an appointment given a payment's status and
 * amount. `confirm` only when fully paid; `amount_mismatch` guards against
 * underpayment; `cancel` only releases a still-pending hold on failure.
 */
export function decidePaymentOutcome(params: {
  paymentStatus: PaymentStatus;
  amountCents: number;
  servicePriceCents: number;
  appointmentStatus: string;
}): PaymentOutcome {
  const { paymentStatus, amountCents, servicePriceCents, appointmentStatus } =
    params;

  if (paymentStatus === "succeeded") {
    if (amountCents < servicePriceCents) return "amount_mismatch";
    return "confirm";
  }

  if (paymentStatus === "failed" && appointmentStatus === "pending") {
    return "cancel";
  }

  return "noop";
}
