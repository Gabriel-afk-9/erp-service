import { CpfFormatError } from "../errors/cpf-format.error.js";

function checkDigit(digits: number[], factor: number): number {
  let sum = 0;
  for (const digit of digits) {
    sum += digit * factor;
    factor -= 1;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export const Cpf = {
  from(value: string | null | undefined): string | null {
    if (value === null || value === undefined || value.trim() === "") return null;
    const digits = value.replace(/\D/g, "");
    if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) {
      throw new CpfFormatError();
    }
    const numbers = digits.split("").map(Number);
    if (
      checkDigit(numbers.slice(0, 9), 10) !== numbers[9] ||
      checkDigit(numbers.slice(0, 10), 11) !== numbers[10]
    ) {
      throw new CpfFormatError();
    }
    return digits;
  },
};
