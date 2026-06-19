import { describe, it, expect } from "vitest";
import { mapMercadoPagoStatus, decidePaymentOutcome } from "./payment-status";

describe("mapMercadoPagoStatus", () => {
  it("maps approved to succeeded", () => {
    expect(mapMercadoPagoStatus("approved")).toBe("succeeded");
  });

  it("maps in-flight statuses to processing", () => {
    expect(mapMercadoPagoStatus("pending")).toBe("processing");
    expect(mapMercadoPagoStatus("in_process")).toBe("processing");
  });

  it("maps rejected and cancelled to failed", () => {
    expect(mapMercadoPagoStatus("rejected")).toBe("failed");
    expect(mapMercadoPagoStatus("cancelled")).toBe("failed");
  });

  it("maps refunds and chargebacks to refunded", () => {
    expect(mapMercadoPagoStatus("refunded")).toBe("refunded");
    expect(mapMercadoPagoStatus("charged_back")).toBe("refunded");
  });

  it("falls back to pending for unknown/undefined statuses", () => {
    expect(mapMercadoPagoStatus(undefined)).toBe("pending");
    expect(mapMercadoPagoStatus("something_new")).toBe("pending");
  });
});

describe("decidePaymentOutcome", () => {
  const base = {
    paymentStatus: "succeeded" as const,
    amountCents: 5000,
    servicePriceCents: 5000,
    appointmentStatus: "pending",
  };

  it("confirms when paid in full", () => {
    expect(decidePaymentOutcome(base)).toBe("confirm");
  });

  it("confirms when the boundary amount exactly covers the price", () => {
    expect(
      decidePaymentOutcome({ ...base, amountCents: 5000, servicePriceCents: 5000 }),
    ).toBe("confirm");
  });

  it("flags an underpayment instead of confirming", () => {
    expect(decidePaymentOutcome({ ...base, amountCents: 4999 })).toBe(
      "amount_mismatch",
    );
  });

  it("cancels a pending appointment when payment fails", () => {
    expect(
      decidePaymentOutcome({
        ...base,
        paymentStatus: "failed",
        appointmentStatus: "pending",
      }),
    ).toBe("cancel");
  });

  it("does not cancel an already-confirmed appointment on a failed notice", () => {
    expect(
      decidePaymentOutcome({
        ...base,
        paymentStatus: "failed",
        appointmentStatus: "confirmed",
      }),
    ).toBe("noop");
  });

  it("does nothing for in-flight (processing) payments", () => {
    expect(
      decidePaymentOutcome({ ...base, paymentStatus: "processing" }),
    ).toBe("noop");
  });

  it("does nothing for refunds (handled manually for now)", () => {
    expect(
      decidePaymentOutcome({ ...base, paymentStatus: "refunded" }),
    ).toBe("noop");
  });
});
