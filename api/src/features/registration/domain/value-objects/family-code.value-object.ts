import { FamilyCodeInvalidError } from "../errors/family-code-invalid.error.js";

export type FamilyCode = string & { readonly __brand: "FamilyCode" };

export const FamilyCode = {
  from(value: string): FamilyCode {
    if (!/^\d{6}$/.test(value)) {
      throw new FamilyCodeInvalidError(value);
    }
    return value as FamilyCode;
  },
};
