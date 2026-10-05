import type { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import { InvalidDateRangeError } from "../errors/invalid-date-range.error.js";
import { PersonNameInvalidError } from "../errors/person-name-invalid.error.js";
import { Cpf } from "../value-objects/cpf.value-object.js";
import { TextTooLongError } from "../errors/text-too-long.error.js";

export type PersonSex = "MALE" | "FEMALE" | "OTHER";

export interface PersonProps {
  id: string;
  name: string;
  birthDate: CivilDate | null;
  sex: PersonSex | null;
  cpf: string | null;
  rg: string | null;
  occupation: string | null;
  educationLevel: string | null;
  contactPhone: string | null;
  revision: number;
}

export interface NewPersonProps {
  name: string;
  birthDate?: CivilDate | null;
  sex?: PersonSex | null;
  cpf?: string | null;
  rg?: string | null;
  occupation?: string | null;
  educationLevel?: string | null;
  contactPhone?: string | null;
}

export interface PersonDetailsCorrection {
  name?: string;
  contactPhone?: string | null;
  occupation?: string | null;
  educationLevel?: string | null;
}

const MAX_TEXT_100 = 100;
const MAX_TEXT_30 = 30;
const MAX_PHONE = 50;

function normalizeText(value: string | null | undefined, max: number, field: string): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.length > max) {
    throw new TextTooLongError(field, max);
  }
  return trimmed;
}

function normalizeName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    throw new PersonNameInvalidError();
  }
  if (trimmed.length > 200) {
    throw new TextTooLongError("name", 200);
  }
  return trimmed;
}

export class Person {
  private constructor(private props: PersonProps) {}

  static create(input: NewPersonProps, today: CivilDate): Person {
    if (input.birthDate !== null && input.birthDate !== undefined && input.birthDate > today) {
      throw new InvalidDateRangeError("birth date cannot be in the future");
    }
    return new Person({
      id: Id.generate(),
      name: normalizeName(input.name),
      birthDate: input.birthDate ?? null,
      sex: input.sex ?? null,
      cpf: Cpf.from(input.cpf ?? null),
      rg: normalizeText(input.rg, MAX_TEXT_30, "rg"),
      occupation: normalizeText(input.occupation, MAX_TEXT_100, "occupation"),
      educationLevel: normalizeText(input.educationLevel, MAX_TEXT_100, "educationLevel"),
      contactPhone: normalizeText(input.contactPhone, MAX_PHONE, "contactPhone"),
      revision: 1,
    });
  }

  static restore(props: PersonProps): Person {
    return new Person({ ...props });
  }

  correctDetails(fields: PersonDetailsCorrection): void {
    if (fields.name !== undefined) {
      this.props.name = normalizeName(fields.name);
    }
    if (fields.contactPhone !== undefined) {
      this.props.contactPhone = normalizeText(fields.contactPhone, MAX_PHONE, "contactPhone");
    }
    if (fields.occupation !== undefined) {
      this.props.occupation = normalizeText(fields.occupation, MAX_TEXT_100, "occupation");
    }
    if (fields.educationLevel !== undefined) {
      this.props.educationLevel = normalizeText(fields.educationLevel, MAX_TEXT_100, "educationLevel");
    }
    this.props.revision += 1;
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get birthDate(): CivilDate | null {
    return this.props.birthDate;
  }

  get sex(): PersonSex | null {
    return this.props.sex;
  }

  get cpf(): string | null {
    return this.props.cpf;
  }

  get rg(): string | null {
    return this.props.rg;
  }

  get occupation(): string | null {
    return this.props.occupation;
  }

  get educationLevel(): string | null {
    return this.props.educationLevel;
  }

  get contactPhone(): string | null {
    return this.props.contactPhone;
  }

  get revision(): number {
    return this.props.revision;
  }
}
