import { describe, it, expect } from "vitest";
import { canAdvanceFromStep } from "./booking-validation";
import type { BookingState } from "./booking-provider";

const base: BookingState = {
  barberId: "",
  serviceId: "",
  date: null,
  time: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
};

const validCustomer: BookingState = {
  ...base,
  customerName: "Al",
  customerEmail: "al@example.com",
  customerPhone: "5551234567",
};

describe("canAdvanceFromStep", () => {
  it("step 0 requires a barber", () => {
    expect(canAdvanceFromStep(0, base)).toBe(false);
    expect(canAdvanceFromStep(0, { ...base, barberId: "1" })).toBe(true);
  });

  it("step 1 requires a service", () => {
    expect(canAdvanceFromStep(1, base)).toBe(false);
    expect(canAdvanceFromStep(1, { ...base, serviceId: "1" })).toBe(true);
  });

  it("step 2 requires both a date and a time", () => {
    expect(canAdvanceFromStep(2, { ...base, date: new Date() })).toBe(false);
    expect(canAdvanceFromStep(2, { ...base, time: "10:00" })).toBe(false);
    expect(
      canAdvanceFromStep(2, { ...base, date: new Date(), time: "10:00" }),
    ).toBe(true);
  });

  describe("step 3 (customer details)", () => {
    it("rejects a single-character name even with valid email and phone (regression)", () => {
      expect(canAdvanceFromStep(3, { ...validCustomer, customerName: "A" })).toBe(
        false,
      );
    });

    it("accepts a two-character name", () => {
      expect(canAdvanceFromStep(3, validCustomer)).toBe(true);
    });

    it("rejects an empty or malformed email", () => {
      expect(canAdvanceFromStep(3, { ...validCustomer, customerEmail: "" })).toBe(
        false,
      );
      expect(
        canAdvanceFromStep(3, { ...validCustomer, customerEmail: "abc" }),
      ).toBe(false);
    });

    it("rejects a phone shorter than 10 digits", () => {
      expect(
        canAdvanceFromStep(3, { ...validCustomer, customerPhone: "123" }),
      ).toBe(false);
    });
  });

  it("rejects unknown steps", () => {
    expect(canAdvanceFromStep(4, validCustomer)).toBe(false);
  });
});
