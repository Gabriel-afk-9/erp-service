import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class HomeVisitRequiredError extends DomainError {
  readonly code = "HOME_VISIT_REQUIRED";

  constructor() {
    super("A home visit detail is required for home visit activities");
  }
}
