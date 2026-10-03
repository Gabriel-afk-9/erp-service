import { DomainError } from "./domain.error.js";

export class PersonNotInFamilyError extends DomainError {
  readonly code = "PERSON_NOT_IN_FAMILY";

  constructor(personId: string) {
    super(`Person has no valid family membership: ${personId}`);
  }
}
