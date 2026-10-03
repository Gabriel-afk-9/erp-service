import { ConcurrentModificationError } from "../../../../../shared/domain/errors/concurrent-modification.error.js";
import { FamilyNotFoundError } from "../../../domain/errors/family-not-found.error.js";
import type { RegistrationUnitOfWork } from "../../../domain/repositories/registration-unit-of-work.js";
import type { CorrectFamilyInput } from "./correct-family.input.js";
import type { CorrectFamilyOutput } from "./correct-family.output.js";

export class CorrectFamilyUseCase {
  constructor(private readonly uow: RegistrationUnitOfWork) {}

  async execute(input: CorrectFamilyInput): Promise<CorrectFamilyOutput> {
    let revision = 0;
    const occurredAt = new Date().toISOString();
    await this.uow.transactional(async (stores) => {
      const family = await stores.families.findById(input.familyId);
      if (family === null) {
        throw new FamilyNotFoundError(input.familyId);
      }
      if (family.revision !== input.expectedRevision) {
        throw new ConcurrentModificationError(input.expectedRevision, family.revision);
      }
      const before = {
        referenceName: family.referenceName,
        address: family.address,
        neighborhood: family.neighborhood,
        postalCode: family.postalCode,
        locationType: family.locationType,
        contactPhone: family.contactPhone,
        revision: family.revision,
      };
      family.correctDetails({
        referenceName: input.referenceName,
        address: input.address,
        neighborhood: input.neighborhood,
        postalCode: input.postalCode,
        locationType: input.locationType,
        contactPhone: input.contactPhone,
      });
      await stores.families.save(family);
      await stores.audits.recordAudit({
        entityType: "Family",
        entityId: family.id,
        action: "CORRECTED",
        actorId: input.actorId,
        occurredAt,
        before,
        after: {
          referenceName: family.referenceName,
          address: family.address,
          neighborhood: family.neighborhood,
          postalCode: family.postalCode,
          locationType: family.locationType,
          contactPhone: family.contactPhone,
          revision: family.revision,
        },
        reason: input.reason,
      });
      revision = family.revision;
    });
    return { familyId: input.familyId, revision };
  }
}
