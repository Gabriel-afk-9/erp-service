import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class PersonAlreadyMemberError extends DomainError {
  readonly code = "PERSON_ALREADY_MEMBER";

  constructor(personId: string) {
    super(`Person already has an overlapping membership: ${personId}`);
  }
}
