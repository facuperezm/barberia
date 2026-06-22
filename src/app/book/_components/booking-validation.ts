import type { BookingState } from "./booking-provider";

// Shared with customer-step.tsx so the Continue/Complete gate and the inline
// field errors are driven by the same rules and can never disagree.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_NAME_LENGTH = 2;
export const MIN_PHONE_LENGTH = 10;

/**
 * Whether the wizard may advance past the given (0-indexed) step with the
 * current state. Pure and exhaustively unit-tested in booking-validation.test.ts.
 */
export function canAdvanceFromStep(step: number, state: BookingState): boolean {
  switch (step) {
    case 0:
      return !!state.barberId;
    case 1:
      return !!state.serviceId;
    case 2:
      return !!state.date && !!state.time;
    case 3:
      return (
        state.customerName.length >= MIN_NAME_LENGTH &&
        EMAIL_REGEX.test(state.customerEmail) &&
        state.customerPhone.length >= MIN_PHONE_LENGTH
      );
    default:
      return false;
  }
}
