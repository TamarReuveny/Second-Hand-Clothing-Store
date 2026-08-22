import { describe, it, expect } from "vitest";
import { parseListingFields, getNewPhotos, MAX_PHOTO_SIZE } from "./listing-validation";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const validFields = {
  title: "Denim Jacket",
  description: "Barely worn",
  price: "45",
  size: "M",
  color: "Blue",
  condition: "good",
  category: "outerwear",
};

describe("parseListingFields", () => {
  it("accepts a fully valid submission", () => {
    const result = parseListingFields(makeFormData(validFields));
    expect(result).toEqual({
      title: "Denim Jacket",
      description: "Barely worn",
      price: 45,
      size: "M",
      color: "Blue",
      condition: "good",
      category: "outerwear",
    });
  });

  it("trims whitespace from text fields", () => {
    const result = parseListingFields(
      makeFormData({ ...validFields, title: "  Denim Jacket  ", size: " M " }),
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.title).toBe("Denim Jacket");
      expect(result.size).toBe("M");
    }
  });

  it("rejects a missing title", () => {
    const result = parseListingFields(makeFormData({ ...validFields, title: "" }));
    expect(result).toEqual({ error: "Title and size are required." });
  });

  it("rejects a missing size", () => {
    const result = parseListingFields(makeFormData({ ...validFields, size: "" }));
    expect(result).toEqual({ error: "Title and size are required." });
  });

  it("rejects a missing color", () => {
    const result = parseListingFields(makeFormData({ ...validFields, color: "" }));
    expect(result).toEqual({ error: "Please select a color." });
  });

  it("rejects a negative price", () => {
    const result = parseListingFields(makeFormData({ ...validFields, price: "-5" }));
    expect(result).toEqual({ error: "Price must be a non-negative number." });
  });

  it("rejects a non-numeric price", () => {
    const result = parseListingFields(makeFormData({ ...validFields, price: "free" }));
    expect(result).toEqual({ error: "Price must be a non-negative number." });
  });

  it("accepts a price of exactly 0", () => {
    const result = parseListingFields(makeFormData({ ...validFields, price: "0" }));
    expect("error" in result).toBe(false);
  });

  it("rejects an invalid condition", () => {
    const result = parseListingFields(makeFormData({ ...validFields, condition: "brand-new-ish" }));
    expect(result).toEqual({ error: "Please choose a valid condition." });
  });

  it("rejects an invalid category", () => {
    const result = parseListingFields(makeFormData({ ...validFields, category: "electronics" }));
    expect(result).toEqual({ error: "Please choose a valid category." });
  });
});

describe("getNewPhotos", () => {
  it("returns an empty array when no photos are attached", () => {
    const fd = new FormData();
    expect(getNewPhotos(fd)).toEqual([]);
  });

  it("filters out empty file entries (unselected file inputs)", () => {
    const fd = new FormData();
    fd.append("photos", new File([], "", { type: "" }));
    expect(getNewPhotos(fd)).toEqual([]);
  });

  it("accepts valid image files", () => {
    const fd = new FormData();
    const file = new File(["data"], "photo.png", { type: "image/png" });
    fd.append("photos", file);
    expect(getNewPhotos(fd)).toEqual([file]);
  });

  it("rejects a non-image file", () => {
    const fd = new FormData();
    fd.append("photos", new File(["data"], "resume.pdf", { type: "application/pdf" }));
    expect(getNewPhotos(fd)).toEqual({ error: "All photos must be image files." });
  });

  it("rejects a photo over the size limit", () => {
    const fd = new FormData();
    const bigFile = new File([new Uint8Array(MAX_PHOTO_SIZE + 1)], "big.png", {
      type: "image/png",
    });
    fd.append("photos", bigFile);
    expect(getNewPhotos(fd)).toEqual({ error: "Each photo must be smaller than 5MB." });
  });
});
