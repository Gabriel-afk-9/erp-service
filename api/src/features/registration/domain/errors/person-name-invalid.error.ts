import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class PersonNameInvalidError extends DomainError {
  readonly code = "PERSON_NAME_INVALID";

  constructor() {
    super("Invalid person name: must have at least 2 characters");
  }
}
