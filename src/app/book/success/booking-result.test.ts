import { describe, it, expect } from "vitest";
import { bookingResultContent } from "./booking-result";

describe("bookingResultContent", () => {
  it("celebrates a confirmed booking", () => {
    const content = bookingResultContent("confirmed");
    expect(content.tone).toBe("success");
    expect(content.title).toMatch(/confirm/i);
  });

  it("tells a pending booking we're still finalizing payment", () => {
    const content = bookingResultContent("pending");
    expect(content.tone).toBe("pending");
    expect(content.description).toMatch(/email/i);
  });

  it("explains a cancelled booking instead of claiming success", () => {
    const content = bookingResultContent("cancelled");
    expect(content.tone).toBe("cancelled");
    expect(content.title).not.toMatch(/thank you/i);
  });

  it("falls back to a neutral booked message for unexpected statuses", () => {
    const content = bookingResultContent("completed");
    expect(content.tone).toBe("success");
  });
});
