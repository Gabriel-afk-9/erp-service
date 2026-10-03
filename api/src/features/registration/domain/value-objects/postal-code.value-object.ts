import { PostalCodeInvalidError } from "../errors/postal-code-invalid.error.js";

export const PostalCode = {
  from(value: string | null | undefined): string | null {
    if (value === null || value === undefined || value.trim() === "") return null;
    const digits = value.replace(/\D/g, "");
    if (!/^\d{8}$/.test(digits)) {
      throw new PostalCodeInvalidError(value);
    }
    return digits;
  },
};
