import { describe, expect, it } from "vitest";
import { Family } from "../family.entity.js";
import { TextTooLongError } from "../../errors/text-too-long.error.js";
import { PostalCodeInvalidError } from "../../errors/postal-code-invalid.error.js";

describe("Family validation", () => {
  it("creates family with only locationType (rest stays null)", () => {
    const family = Family.create({ code: "000001", locationType: "URBAN" });
    expect(family.code).toBe("000001");
    expect(family.referenceName).toBeNull();
    expect(family.postalCode).toBeNull();
    expect(family.revision).toBe(1);
  });

  it("normalizes postal code to 8 digits", () => {
    const family = Family.create({ code: "000002", locationType: "RURAL", postalCode: "60000-001" });
    expect(family.postalCode).toBe("60000001");
  });

  it("rejects invalid postal code", () => {
    expect(() => Family.create({ code: "000003", locationType: "URBAN", postalCode: "123" })).toThrow(
      PostalCodeInvalidError,
    );
  });

  it("rejects fields longer than their max instead of truncating", () => {
    expect(() =>
      Family.create({ code: "000004", locationType: "URBAN", referenceName: "x".repeat(501) }),
    ).toThrow(TextTooLongError);
    expect(() =>
      Family.create({ code: "000005", locationType: "URBAN", contactPhone: "x".repeat(51) }),
    ).toThrow(TextTooLongError);
  });

  it("treats blank optional fields as null", () => {
    const family = Family.create({ code: "000006", locationType: "URBAN", address: "   " });
    expect(family.address).toBeNull();
  });
});
