import { describe, expect, it } from "vitest";
import {
  generateTimeSlots,
  isSlotBlocked,
  normalizeTime,
  parseDateTime,
} from "@/lib/dates";

describe("normalizeTime", () => {
  it("strips seconds from HH:mm:ss", () => {
    expect(normalizeTime("09:30:00")).toBe("09:30");
  });

  it("passes through HH:mm", () => {
    expect(normalizeTime("14:00")).toBe("14:00");
  });

  it("pads single-digit hours", () => {
    expect(normalizeTime("9:00")).toBe("09:00");
  });
});

describe("parseDateTime", () => {
  it("interprets date+time as Argentina wall time (UTC-3)", () => {
    const result = parseDateTime("2026-06-10", "14:30");
    expect(result.toISOString()).toBe("2026-06-10T17:30:00.000Z");
  });

  it("is correct in January too (Argentina has no DST)", () => {
    const result = parseDateTime("2026-01-15", "09:00");
    expect(result.toISOString()).toBe("2026-01-15T12:00:00.000Z");
  });

  it("crosses the day boundary correctly for late-night times", () => {
    const result = parseDateTime("2026-06-10", "23:59");
    expect(result.toISOString()).toBe("2026-06-11T02:59:00.000Z");
  });
});

describe("generateTimeSlots", () => {
  it("generates slots stepped by duration", () => {
    expect(generateTimeSlots("09:00", "11:00", 30)).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
    ]);
  });
});

describe("isSlotBlocked", () => {
  it("blocks a slot overlapped by a longer existing appointment", () => {
    // existing 60-min appointment at 10:00 must block a 30-min slot at 10:30
    expect(isSlotBlocked("10:30", 30, "10:00", 60)).toBe(true);
  });

  it("does not block back-to-back slots", () => {
    expect(isSlotBlocked("11:00", 30, "10:00", 60)).toBe(false);
  });
});
