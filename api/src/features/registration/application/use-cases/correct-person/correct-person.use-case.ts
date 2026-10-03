import { ConcurrentModificationError } from "../../../../../shared/domain/errors/concurrent-modification.error.js";
import { PersonNotFoundError } from "../../../domain/errors/person-not-found.error.js";
import type { RegistrationUnitOfWork } from "../../../domain/repositories/registration-unit-of-work.js";
import type { CorrectPersonInput } from "./correct-person.input.js";
import type { CorrectPersonOutput } from "./correct-person.output.js";

export class CorrectPersonUseCase {
  constructor(private readonly uow: RegistrationUnitOfWork) {}

  async execute(input: CorrectPersonInput): Promise<CorrectPersonOutput> {
    let revision = 0;
    const occurredAt = new Date().toISOString();
    await this.uow.transactional(async (stores) => {
      const person = await stores.persons.findById(input.personId);
      if (person === null) {
        throw new PersonNotFoundError(input.personId);
      }
      if (person.revision !== input.expectedRevision) {
        throw new ConcurrentModificationError(input.expectedRevision, person.revision);
      }
      const before = {
        name: person.name,
        contactPhone: person.contactPhone,
        occupation: person.occupation,
        educationLevel: person.educationLevel,
        revision: person.revision,
      };
      person.correctDetails({
        name: input.name,
        contactPhone: input.contactPhone,
        occupation: input.occupation,
        educationLevel: input.educationLevel,
      });
      await stores.persons.save(person);
      await stores.audits.recordAudit({
        entityType: "Person",
        entityId: person.id,
        action: "CORRECTED",
        actorId: input.actorId,
        occurredAt,
        before,
        after: {
          name: person.name,
          contactPhone: person.contactPhone,
          occupation: person.occupation,
          educationLevel: person.educationLevel,
          revision: person.revision,
        },
        reason: input.reason,
      });
      revision = person.revision;
    });
    return { personId: input.personId, revision };
  }
}
