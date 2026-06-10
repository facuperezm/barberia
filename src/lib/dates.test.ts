import { describe, expect, it } from "vitest";
import { normalizeTime } from "@/lib/dates";

describe("normalizeTime", () => {
  it("strips seconds from HH:mm:ss", () => {
    expect(normalizeTime("09:30:00")).toBe("09:30");
  });

  it("passes through HH:mm", () => {
    expect(normalizeTime("14:00")).toBe("14:00");
  });
});
