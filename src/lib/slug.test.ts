import { describe, it, expect } from "vitest";
import { normalizeSlug } from "@/lib/slug";

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
