import { describe, expect, it } from "vitest";
import { DecimalPlacesInvalidError } from "../errors/decimal-places-invalid.error.js";
import { DecimalPlaces } from "../value-objects/decimal-places.value-object.js";

describe("DecimalPlaces value object", () => {
  it.each([0, 1, 2, 3, 4])("accepts %i", (value) => {
    expect(DecimalPlaces.of(value)).toBe(value);
  });

  it("rejects 5", () => {
    expect(() => DecimalPlaces.of(5)).toThrow(DecimalPlacesInvalidError);
  });

  it("rejects -1", () => {
    expect(() => DecimalPlaces.of(-1)).toThrow(DecimalPlacesInvalidError);
  });

  it("rejects non-integer 1.5", () => {
    expect(() => DecimalPlaces.of(1.5)).toThrow(DecimalPlacesInvalidError);
  });
});
