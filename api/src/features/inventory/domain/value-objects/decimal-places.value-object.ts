import { DecimalPlacesInvalidError } from "../errors/decimal-places-invalid.error.js";

export type DecimalPlaces = number & { readonly _brand: "DecimalPlaces" };

export const DecimalPlaces = {
  of(value: number): DecimalPlaces {
    if (!Number.isInteger(value) || value < 0 || value > 4) {
      throw new DecimalPlacesInvalidError(value);
    }
    return value as DecimalPlaces;
  },
};
