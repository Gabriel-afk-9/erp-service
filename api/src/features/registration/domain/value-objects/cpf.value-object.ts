import { CpfFormatError } from "../errors/cpf-format.error.js";

// Prototype rule: CPF is an 11-digit identifier used for duplicate search.
// Check digits are not validated and uniqueness is not enforced (LAC-02 open).
export const Cpf = {
  from(value: string | null | undefined): string | null {
    if (value === null || value === undefined || value.trim() === "") return null;
    const digits = value.replace(/\D/g, "");
    if (!/^\d{11}$/.test(digits)) {
      throw new CpfFormatError();
    }
    return digits;
  },
};
