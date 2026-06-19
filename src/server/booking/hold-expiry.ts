/**
 * A paid booking is inserted as `pending` and holds its slot via the
 * no-double-booking exclusion constraint. If the customer abandons checkout,
 * MercadoPago sends no webhook, so the hold would otherwise block the slot
 * forever. After this TTL the hold is considered abandoned and the slot is
 * reclaimable. Matches the MercadoPago preference expiry in
 * `src/server/payments/mercadopago.ts` (30 minutes).
 */
export const HOLD_TTL_MS = 30 * 60 * 1000;

/**
 * True when an appointment is an abandoned payment hold whose TTL has elapsed.
 * Only `pending` appointments can be holds — free bookings are `confirmed`
 * immediately and paid bookings become `confirmed`/`cancelled` via the webhook.
 */
export function isHoldExpired(
  appointment: { status: string; createdAt: Date },
  now: Date,
  ttlMs: number = HOLD_TTL_MS,
): boolean {
  if (appointment.status !== "pending") return false;
  return now.getTime() - appointment.createdAt.getTime() >= ttlMs;
}
