import { describe, it, expect } from "vitest";
import { resolveCategorySynonym } from "./search";

describe("resolveCategorySynonym", () => {
  it("maps a known synonym to its category", () => {
    expect(resolveCategorySynonym("jeans")).toBe("bottoms");
    expect(resolveCategorySynonym("sneakers")).toBe("shoes");
  });

  it("is case-insensitive", () => {
    expect(resolveCategorySynonym("Jeans")).toBe("bottoms");
    expect(resolveCategorySynonym("SNEAKERS")).toBe("shoes");
  });

  it("returns the original term unchanged when there is no synonym", () => {
    expect(resolveCategorySynonym("vintage")).toBe("vintage");
  });

  it("returns an already-correct category name unchanged", () => {
    expect(resolveCategorySynonym("dresses")).toBe("dresses");
  });
});
