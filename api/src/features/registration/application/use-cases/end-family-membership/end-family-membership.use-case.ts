import { ConcurrentModificationError } from "../../../../../shared/domain/errors/concurrent-modification.error.js";
import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { FamilyNotFoundError } from "../../../domain/errors/family-not-found.error.js";
import { MembershipNotFoundError } from "../../../domain/errors/membership-not-found.error.js";
import type { RegistrationUnitOfWork } from "../../../domain/repositories/registration-unit-of-work.js";
import type { EndFamilyMembershipInput } from "./end-family-membership.input.js";
import type { EndFamilyMembershipOutput } from "./end-family-membership.output.js";

export class EndFamilyMembershipUseCase {
  constructor(private readonly uow: RegistrationUnitOfWork) {}

  async execute(input: EndFamilyMembershipInput): Promise<EndFamilyMembershipOutput> {
    const validUntil = CivilDate.from(input.validUntil);
    const occurredAt = new Date().toISOString();
    await this.uow.transactional(async (stores) => {
      const membership = await stores.memberships.findById(input.membershipId);
      if (membership === null) {
        throw new MembershipNotFoundError(input.membershipId);
      }
      if (membership.revision !== input.expectedRevision) {
        throw new ConcurrentModificationError(input.expectedRevision, membership.revision);
      }
      const before = { validUntil: membership.validUntil, revision: membership.revision };
      membership.end(validUntil);
      const family = await stores.families.findById(membership.familyId);
      if (family === null) {
        throw new FamilyNotFoundError(membership.familyId);
      }
      family.bumpRevision();
      await stores.memberships.save(membership);
      await stores.families.save(family);
      await stores.audits.recordAudit({
        entityType: "FamilyMembership",
        entityId: membership.id,
        action: "MEMBERSHIP_ENDED",
        actorId: input.actorId,
        occurredAt,
        before,
        after: { validUntil: membership.validUntil, revision: membership.revision },
        reason: input.reason,
      });
    });
    return { membershipId: input.membershipId, validUntil };
  }
}
