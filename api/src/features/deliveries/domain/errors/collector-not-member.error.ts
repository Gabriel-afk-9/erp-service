import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class CollectorNotMemberError extends DomainError {
  readonly code = "COLLECTOR_NOT_MEMBER";

  constructor(personId: string, familyId: string) {
    super(`Person ${personId} is not a member of family ${familyId} at the delivery date`);
  }
}
