import { QuantityIncrementInvalidError } from "../errors/quantity-increment-invalid.error.js";

export type QuantityIncrement = number & { readonly _brand: "QuantityIncrement" };

export const QuantityIncrement = {
  of(value: number): QuantityIncrement {
    if (!Number.isFinite(value) || value <= 0) {
      throw new QuantityIncrementInvalidError(value);
    }
    return value as QuantityIncrement;
  },
};
