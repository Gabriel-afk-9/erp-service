import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class FutureDateError extends DomainError {
  readonly code = "FUTURE_DATE";

  constructor(occurredAt: string) {
    super(`Occurred date cannot be in the future: ${occurredAt}`);
  }
}
