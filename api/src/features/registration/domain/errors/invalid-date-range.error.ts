import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class InvalidDateRangeError extends DomainError {
  readonly code = "INVALID_DATE_RANGE";

  constructor(detail: string) {
    super(`Invalid date range: ${detail}`);
  }
}
