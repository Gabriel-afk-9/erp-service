import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { FamilyMembership } from "../../../domain/entities/family-membership.entity.js";
import { FamilyNotFoundError } from "../../../domain/errors/family-not-found.error.js";
import { HolderAlreadyExistsError } from "../../../domain/errors/holder-already-exists.error.js";
import { PersonAlreadyMemberError } from "../../../domain/errors/person-already-member.error.js";
import { PersonNotFoundError } from "../../../domain/errors/person-not-found.error.js";
import type { RegistrationUnitOfWork } from "../../../domain/repositories/registration-unit-of-work.js";
import type { AddFamilyMemberInput } from "./add-family-member.input.js";
import type { AddFamilyMemberOutput } from "./add-family-member.output.js";

export class AddFamilyMemberUseCase {
  constructor(private readonly uow: RegistrationUnitOfWork) {}

  async execute(input: AddFamilyMemberInput): Promise<AddFamilyMemberOutput> {
    const validFrom = CivilDate.from(input.validFrom);
    const today = new Date().toISOString().slice(0, 10) as CivilDate;
    const membership = FamilyMembership.create(
      {
        personId: input.personId,
        familyId: input.familyId,
        relationshipToReference: input.relationshipToReference ?? null,
        isReference: input.isReference,
        validFrom,
      },
      today,
    );
    const occurredAt = new Date().toISOString();
    await this.uow.transactional(async (stores) => {
      const family = await stores.families.findById(input.familyId);
      if (family === null) {
        throw new FamilyNotFoundError(input.familyId);
      }
      const person = await stores.persons.findById(input.personId);
      if (person === null) {
        throw new PersonNotFoundError(input.personId);
      }
      const overlapping = await stores.memberships.findOverlapping(input.personId, validFrom, null);
      if (overlapping.length > 0) {
        throw new PersonAlreadyMemberError(input.personId);
      }
      if (input.isReference) {
        const active = await stores.memberships.findActiveByFamily(input.familyId, validFrom);
        if (active.some((m) => m.isReference)) {
          throw new HolderAlreadyExistsError(input.familyId);
        }
      }
      family.bumpRevision();
      await stores.memberships.save(membership);
      await stores.families.save(family);
      await stores.audits.recordAudit({
        entityType: "FamilyMembership",
        entityId: membership.id,
        action: "CREATED",
        actorId: input.actorId,
        occurredAt,
        before: null,
        after: {
          familyId: input.familyId,
          personId: input.personId,
          validFrom,
          revision: membership.revision,
        },
        reason: null,
      });
    });
    return { membershipId: membership.id, validFrom: membership.validFrom };
  }
}
