import { describe, it, expect } from "vitest";
import { isHoldExpired, HOLD_TTL_MS } from "./hold-expiry";

const NOW = new Date("2026-06-19T12:00:00.000Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

describe("isHoldExpired", () => {
  it("treats a pending hold older than the TTL as expired", () => {
    expect(
      isHoldExpired({ status: "pending", createdAt: minutesAgo(31) }, NOW),
    ).toBe(true);
  });

  it("treats a fresh pending hold as still active", () => {
    expect(
      isHoldExpired({ status: "pending", createdAt: minutesAgo(5) }, NOW),
    ).toBe(false);
  });

  it("expires exactly at the TTL boundary", () => {
    const createdAt = new Date(NOW.getTime() - HOLD_TTL_MS);
    expect(isHoldExpired({ status: "pending", createdAt }, NOW)).toBe(true);
  });

  it("never expires a confirmed appointment, however old", () => {
    expect(
      isHoldExpired({ status: "confirmed", createdAt: minutesAgo(999) }, NOW),
    ).toBe(false);
  });

  it("never expires a cancelled appointment", () => {
    expect(
      isHoldExpired({ status: "cancelled", createdAt: minutesAgo(999) }, NOW),
    ).toBe(false);
  });
});
