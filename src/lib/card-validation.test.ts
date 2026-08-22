import { describe, it, expect } from "vitest";
import { luhn, formatCardNumber, formatExpiry, isExpiryValid } from "./card-validation";

describe("luhn", () => {
  it("accepts a known-valid test card number", () => {
    expect(luhn("4242 4242 4242 4242")).toBe(true);
  });

  it("rejects a number that fails the checksum", () => {
    expect(luhn("4242 4242 4242 4241")).toBe(false);
  });

  it("rejects numbers shorter than 13 digits", () => {
    expect(luhn("4242")).toBe(false);
  });

  it("rejects empty input", () => {
    expect(luhn("")).toBe(false);
  });
});

describe("formatCardNumber", () => {
  it("groups digits into 4s", () => {
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
  });

  it("strips non-digit characters", () => {
    expect(formatCardNumber("4242-4242-4242-4242")).toBe("4242 4242 4242 4242");
  });

  it("truncates to 16 digits", () => {
    expect(formatCardNumber("42424242424242429999")).toBe("4242 4242 4242 4242");
  });
});

describe("formatExpiry", () => {
  it("inserts a slash after 2 digits", () => {
    expect(formatExpiry("1225")).toBe("12/25");
  });

  it("leaves partial input alone", () => {
    expect(formatExpiry("1")).toBe("1");
    expect(formatExpiry("12")).toBe("12");
  });

  it("strips non-digit characters", () => {
    expect(formatExpiry("12/25")).toBe("12/25");
  });
});

describe("isExpiryValid", () => {
  const fixedNow = new Date("2026-06-15T00:00:00Z");

  it("accepts a future month/year", () => {
    expect(isExpiryValid("12/26", fixedNow)).toBe(true);
  });

  it("accepts the current month", () => {
    expect(isExpiryValid("06/26", fixedNow)).toBe(true);
  });

  it("rejects a past month in the current year", () => {
    expect(isExpiryValid("01/26", fixedNow)).toBe(false);
  });

  it("rejects a past year", () => {
    expect(isExpiryValid("12/25", fixedNow)).toBe(false);
  });

  it("rejects an invalid month", () => {
    expect(isExpiryValid("13/26", fixedNow)).toBe(false);
    expect(isExpiryValid("00/26", fixedNow)).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isExpiryValid("garbage", fixedNow)).toBe(false);
    expect(isExpiryValid("1226", fixedNow)).toBe(false);
  });
});
