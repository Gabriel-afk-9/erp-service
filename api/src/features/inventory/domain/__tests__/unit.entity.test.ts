import { describe, expect, it } from "vitest";
import { Unit } from "../entities/unit.entity.js";
import { DecimalPlacesInvalidError } from "../errors/decimal-places-invalid.error.js";
import { QuantityIncrementInvalidError } from "../errors/quantity-increment-invalid.error.js";
import { DecimalPlaces } from "../value-objects/decimal-places.value-object.js";
import { QuantityIncrement } from "../value-objects/quantity-increment.value-object.js";

describe("Unit entity", () => {
  it("creates with decimalPlaces 0 and increment 1", () => {
    const unit = Unit.create({
      symbol: "un",
      name: "Unidade",
      decimalPlaces: DecimalPlaces.of(0),
      quantityIncrement: QuantityIncrement.of(1),
    });
    expect(unit.symbol).toBe("UN");
    expect(unit.decimalPlaces).toBe(0);
  });

  it("rejects decimalPlaces 5", () => {
    expect(() => DecimalPlaces.of(5)).toThrow(DecimalPlacesInvalidError);
  });

  it("rejects quantityIncrement 0", () => {
    expect(() => QuantityIncrement.of(0)).toThrow(QuantityIncrementInvalidError);
  });

  it("rejects negative quantityIncrement", () => {
    expect(() => QuantityIncrement.of(-1)).toThrow(QuantityIncrementInvalidError);
  });
});
