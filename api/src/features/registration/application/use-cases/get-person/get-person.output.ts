import type { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import type { PersonSex } from "../../../domain/entities/person.entity.js";

export interface GetPersonOutput {
  personId: string;
  name: string;
  birthDate: CivilDate | null;
  sex: PersonSex | null;
  cpf: string | null;
  rg: string | null;
  occupation: string | null;
  educationLevel: string | null;
  contactPhone: string | null;
  revision: number;
  currentFamilyId: string | null;
  currentFamilyCode: string | null;
  currentMembershipId: string | null;
}
