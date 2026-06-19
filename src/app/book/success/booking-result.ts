export type BookingTone = "success" | "pending" | "cancelled";

export interface BookingResultContent {
  tone: BookingTone;
  title: string;
  description: string;
}

/**
 * Map a booking's status to the message shown on the result page. Keeps the
 * page honest: a still-`pending` payment is not announced as a confirmed
 * booking, and a `cancelled` one explains the failed payment.
 */
export function bookingResultContent(status: string): BookingResultContent {
  switch (status) {
    case "pending":
      return {
        tone: "pending",
        title: "Almost there!",
        description:
          "We're finalizing your payment. You'll get an email as soon as your appointment is confirmed.",
      };
    case "cancelled":
      return {
        tone: "cancelled",
        title: "Booking not completed",
        description:
          "Your payment didn't go through, so this appointment wasn't reserved. You can try booking again.",
      };
    default:
      return {
        tone: "success",
        title: "Your appointment is confirmed!",
        description: "Thank you for choosing us — we look forward to seeing you.",
      };
  }
}
