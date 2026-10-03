import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class HomeVisitNotAllowedError extends DomainError {
  readonly code = "HOME_VISIT_NOT_ALLOWED";

  constructor() {
    super("A home visit detail is only allowed for home visit activities");
  }
}
