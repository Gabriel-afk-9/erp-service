import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { PersonNotFoundError } from "../../../domain/errors/person-not-found.error.js";
import type { FamilyRepository } from "../../../domain/repositories/family.repository.js";
import type { MembershipRepository } from "../../../domain/repositories/membership.repository.js";
import type { PersonRepository } from "../../../domain/repositories/person.repository.js";
import type { GetPersonInput } from "./get-person.input.js";
import type { GetPersonOutput } from "./get-person.output.js";

export class GetPersonUseCase {
  constructor(
    private readonly persons: PersonRepository,
    private readonly memberships: MembershipRepository,
    private readonly families: FamilyRepository,
  ) {}

  async execute(input: GetPersonInput): Promise<GetPersonOutput> {
    const person = await this.persons.findById(input.personId);
    if (person === null) {
      throw new PersonNotFoundError(input.personId);
    }
    const timeZone = process.env.APP_TIMEZONE ?? "America/Fortaleza";
    const todayDefault = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()) as CivilDate;
    const asOf =
      input.asOf === undefined || input.asOf === ""
        ? todayDefault
        : CivilDate.from(input.asOf);
    const active = await this.memberships.findActiveByPerson(input.personId, asOf);
    let currentFamilyCode: string | null = null;
    if (active !== null) {
      const family = await this.families.findById(active.familyId);
      currentFamilyCode = family?.code ?? null;
    }
    return {
      personId: person.id,
      name: person.name,
      birthDate: person.birthDate,
      sex: person.sex,
      cpf: person.cpf,
      rg: person.rg,
      occupation: person.occupation,
      educationLevel: person.educationLevel,
      contactPhone: person.contactPhone,
      revision: person.revision,
      currentFamilyId: active?.familyId ?? null,
      currentFamilyCode,
      currentMembershipId: active?.id ?? null,
    };
  }
}
