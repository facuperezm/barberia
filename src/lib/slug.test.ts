import { describe, it, expect } from "vitest";
import { normalizeSlug, nextAvailableSlug } from "@/lib/slug";

describe("normalizeSlug", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(normalizeSlug("Barbería Juan")).toBe("barberia-juan");
  });
  it("strips invalid characters", () => {
    expect(normalizeSlug("El Corte #1!")).toBe("el-corte-1");
  });
  it("collapses repeats and trims edges", () => {
    expect(normalizeSlug("  --Fade   Bros--  ")).toBe("fade-bros");
  });
});

describe("nextAvailableSlug", () => {
  it("returns the normalized base when free", () => {
    expect(nextAvailableSlug("La Barbería", [])).toBe("la-barberia");
  });

  it("suffixes -2 on collision with the base", () => {
    expect(nextAvailableSlug("Elite Barbershop", ["elite-barbershop"])).toBe(
      "elite-barbershop-2",
    );
  });

  it("skips taken suffixes", () => {
    expect(
      nextAvailableSlug("Elite", ["elite", "elite-2", "elite-3"]),
    ).toBe("elite-4");
  });

  it("falls back to 'salon' when normalization is empty", () => {
    expect(nextAvailableSlug("!!!", [])).toBe("salon");
  });
});
