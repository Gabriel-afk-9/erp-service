import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class PersonNotFoundError extends DomainError {
  readonly code = "PERSON_NOT_FOUND";

  constructor(personId: string) {
    super(`Person not found: ${personId}`);
  }
}
