import { describe, expect, it } from "vitest";
import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { CivilDateFormatError } from "../../../../../shared/domain/errors/civil-date-format.error.js";
import { Cpf } from "../cpf.value-object.js";
import { CpfFormatError } from "../../errors/cpf-format.error.js";
import { PostalCode } from "../postal-code.value-object.js";
import { PostalCodeInvalidError } from "../../errors/postal-code-invalid.error.js";

describe("registration value objects", () => {
  it("accepts valid calendar dates and rejects impossible ones", () => {
    expect(CivilDate.from("2024-02-29")).toBe("2024-02-29");
    expect(() => CivilDate.from("2023-02-29")).toThrow(CivilDateFormatError);
    expect(() => CivilDate.from("2024-02-30")).toThrow(CivilDateFormatError);
    expect(() => CivilDate.from("2024-13-01")).toThrow(CivilDateFormatError);
    expect(() => CivilDate.from("01/01/2024")).toThrow(CivilDateFormatError);
  });

  it("normalizes CPF and rejects invalid check digits", () => {
    expect(Cpf.from("529.982.247-25")).toBe("52998224725");
    expect(Cpf.from(null)).toBeNull();
    expect(Cpf.from("   ")).toBeNull();
    expect(() => Cpf.from("123")).toThrow(CpfFormatError);
    expect(() => Cpf.from("11111111111")).toThrow(CpfFormatError);
  });

  it("normalizes postal code and rejects invalid values", () => {
    expect(PostalCode.from("60000-001")).toBe("60000001");
    expect(PostalCode.from(null)).toBeNull();
    expect(() => PostalCode.from("123")).toThrow(PostalCodeInvalidError);
  });
});
