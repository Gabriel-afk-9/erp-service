import { describe, expect, it } from "vitest";
import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { Person } from "../person.entity.js";
import { PersonNameInvalidError } from "../../errors/person-name-invalid.error.js";
import { TextTooLongError } from "../../errors/text-too-long.error.js";
import { CpfFormatError } from "../../errors/cpf-format.error.js";
import { InvalidDateRangeError } from "../../errors/invalid-date-range.error.js";

const TODAY = "2026-05-01" as CivilDate;
const VALID_CPF = "52998224725";

describe("Person validation", () => {
  it("creates minimal person with only name (unknowns stay null)", () => {
    const person = Person.create({ name: "Maria Silva" }, TODAY);
    expect(person.name).toBe("Maria Silva");
    expect(person.birthDate).toBeNull();
    expect(person.cpf).toBeNull();
    expect(person.revision).toBe(1);
  });

  it("trims name and rejects short names", () => {
    const person = Person.create({ name: "  Joao  " }, TODAY);
    expect(person.name).toBe("Joao");
    expect(() => Person.create({ name: "a" }, TODAY)).toThrow(PersonNameInvalidError);
    expect(() => Person.create({ name: "   " }, TODAY)).toThrow(PersonNameInvalidError);
  });

  it("rejects name longer than 200 characters", () => {
    expect(() => Person.create({ name: "a".repeat(201) }, TODAY)).toThrow(TextTooLongError);
  });

  it("rejects future birthDate", () => {
    expect(() => Person.create({ name: "Ana", birthDate: "2999-01-01" as CivilDate }, TODAY)).toThrow(
      InvalidDateRangeError,
    );
  });

  it("normalizes CPF to digits and accepts any 11 digits", () => {
    const person = Person.create({ name: "Ana", cpf: "529.982.247-25" }, TODAY);
    expect(person.cpf).toBe(VALID_CPF);
    expect(Person.create({ name: "Ana", cpf: "11111111111" }, TODAY).cpf).toBe("11111111111");
    expect(() => Person.create({ name: "Ana", cpf: "123" }, TODAY)).toThrow(CpfFormatError);
  });

  it("rejects fields longer than their max instead of truncating", () => {
    expect(() => Person.create({ name: "Ana", rg: "x".repeat(31) }, TODAY)).toThrow(TextTooLongError);
    expect(() => Person.create({ name: "Ana", occupation: "x".repeat(101) }, TODAY)).toThrow(TextTooLongError);
    expect(() => Person.create({ name: "Ana", contactPhone: "x".repeat(51) }, TODAY)).toThrow(TextTooLongError);
  });

  it("treats blank optional fields as null", () => {
    const person = Person.create({ name: "Ana", rg: "   ", occupation: "" }, TODAY);
    expect(person.rg).toBeNull();
    expect(person.occupation).toBeNull();
  });
});
