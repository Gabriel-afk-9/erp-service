import type { PersonSex } from "../../../domain/entities/person.entity.js";

export interface RegisterPersonInput {
  name: string;
  birthDate?: string | null;
  sex?: PersonSex | null;
  cpf?: string | null;
  rg?: string | null;
  occupation?: string | null;
  educationLevel?: string | null;
  contactPhone?: string | null;
  familyId: string;
  validFrom: string;
  relationshipToReference?: string | null;
  isReference: boolean;
  actorId: string;
}
