import { describe, expect, it } from "vitest";
import { QuantityIncrementInvalidError } from "../errors/quantity-increment-invalid.error.js";
import { QuantityIncrement } from "../value-objects/quantity-increment.value-object.js";

describe("QuantityIncrement value object", () => {
  it("accepts 0.001", () => {
    expect(QuantityIncrement.of(0.001)).toBe(0.001);
  });

  it("rejects 0", () => {
    expect(() => QuantityIncrement.of(0)).toThrow(QuantityIncrementInvalidError);
  });

  it("rejects -1", () => {
    expect(() => QuantityIncrement.of(-1)).toThrow(QuantityIncrementInvalidError);
  });
});
