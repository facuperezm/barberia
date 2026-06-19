import { describe, it, expect } from "vitest";
import { pickActiveSalonId } from "@/lib/membership";

describe("pickActiveSalonId", () => {
  it("returns null when the user has no memberships", () => {
    expect(pickActiveSalonId([])).toBeNull();
  });

  it("returns the only salon when the user has one membership", () => {
    expect(pickActiveSalonId([{ salonId: 7 }])).toBe(7);
  });

  it("returns the first salon deterministically for multiple memberships", () => {
    expect(pickActiveSalonId([{ salonId: 3 }, { salonId: 9 }])).toBe(3);
  });
});
