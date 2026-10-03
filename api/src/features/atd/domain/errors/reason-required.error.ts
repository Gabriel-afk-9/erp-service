import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ReasonRequiredError extends DomainError {
  readonly code = "REASON_REQUIRED";

  constructor() {
    super("A reason with at least 3 characters is required");
  }
}
