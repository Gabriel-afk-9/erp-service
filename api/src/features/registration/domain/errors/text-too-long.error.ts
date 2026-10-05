import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class TextTooLongError extends DomainError {
  readonly code = "TEXT_TOO_LONG";

  constructor(field: string, max: number) {
    super(`Field ${field} exceeds maximum length of ${max} characters`);
  }
}
