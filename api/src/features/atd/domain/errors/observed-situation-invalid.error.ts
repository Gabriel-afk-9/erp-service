import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ObservedSituationInvalidError extends DomainError {
  readonly code = "OBSERVED_SITUATION_INVALID";

  constructor() {
    super("Observed situation must be a non-empty text");
  }
}
