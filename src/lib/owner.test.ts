import { describe, it, expect } from "vitest";
import { isOwnerEmail } from "./owner";

const OWNER = "owner@barbershop.com";

describe("isOwnerEmail", () => {
  it("matches the exact owner email", () => {
    expect(isOwnerEmail(OWNER, OWNER)).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(isOwnerEmail("Owner@BarberShop.com", OWNER)).toBe(true);
    expect(isOwnerEmail(OWNER, "OWNER@BARBERSHOP.COM")).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(isOwnerEmail("  owner@barbershop.com  ", OWNER)).toBe(true);
  });

  it("rejects a different email", () => {
    expect(isOwnerEmail("someone-else@barbershop.com", OWNER)).toBe(false);
  });

  it("rejects null, undefined, and empty emails", () => {
    expect(isOwnerEmail(null, OWNER)).toBe(false);
    expect(isOwnerEmail(undefined, OWNER)).toBe(false);
    expect(isOwnerEmail("", OWNER)).toBe(false);
  });
});
