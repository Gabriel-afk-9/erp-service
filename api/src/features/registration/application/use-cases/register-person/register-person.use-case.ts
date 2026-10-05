import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { FamilyMembership } from "../../../domain/entities/family-membership.entity.js";
import { Person } from "../../../domain/entities/person.entity.js";
import { FamilyNotFoundError } from "../../../domain/errors/family-not-found.error.js";
import { HolderAlreadyExistsError } from "../../../domain/errors/holder-already-exists.error.js";
import type { RegistrationUnitOfWork } from "../../../domain/repositories/registration-unit-of-work.js";
import type { RegisterPersonInput } from "./register-person.input.js";
import type { RegisterPersonOutput } from "./register-person.output.js";

function today(): CivilDate {
  const timeZone = process.env.APP_TIMEZONE ?? "America/Fortaleza";
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return formatted as CivilDate;
}

export class RegisterPersonUseCase {
  constructor(private readonly uow: RegistrationUnitOfWork) {}

  async execute(input: RegisterPersonInput): Promise<RegisterPersonOutput> {
    const birthDate = input.birthDate === undefined || input.birthDate === null ? null : CivilDate.from(input.birthDate);
    const validFrom = CivilDate.from(input.validFrom);
    const now = today();
    const person = Person.create(
      {
        name: input.name,
        birthDate,
        sex: input.sex ?? null,
        cpf: input.cpf ?? null,
        rg: input.rg ?? null,
        occupation: input.occupation ?? null,
        educationLevel: input.educationLevel ?? null,
        contactPhone: input.contactPhone ?? null,
      },
      now,
    );
    const membership = FamilyMembership.create(
      {
        personId: person.id,
        familyId: input.familyId,
        relationshipToReference: input.relationshipToReference ?? null,
        isReference: input.isReference,
        validFrom,
      },
      now,
    );
    const occurredAt = new Date().toISOString();
    await this.uow.transactional(async (stores) => {
      const family = await stores.families.findById(input.familyId);
      if (family === null) {
        throw new FamilyNotFoundError(input.familyId);
      }
      // Note: the person id was just generated, so there is no prior overlapping
      // membership to check here. MVP-D04 for new persons is trivially satisfied;
      // the enforced check lives in add-family-member for existing persons.
      if (input.isReference) {
        const active = await stores.memberships.findActiveByFamily(input.familyId, validFrom);
        if (active.some((m) => m.isReference)) {
          throw new HolderAlreadyExistsError(input.familyId);
        }
      }
      family.bumpRevision();
      await stores.persons.save(person);
      await stores.memberships.save(membership);
      await stores.families.save(family);
      await stores.audits.recordAudit({
        entityType: "Person",
        entityId: person.id,
        action: "CREATED",
        actorId: input.actorId,
        occurredAt,
        before: null,
        after: { name: person.name, familyId: input.familyId, revision: person.revision },
        reason: null,
      });
      await stores.audits.recordAudit({
        entityType: "FamilyMembership",
        entityId: membership.id,
        action: "CREATED",
        actorId: input.actorId,
        occurredAt,
        before: null,
        after: { familyId: input.familyId, validFrom, revision: membership.revision },
        reason: null,
      });
    });
    return { personId: person.id, membershipId: membership.id };
  }
}
