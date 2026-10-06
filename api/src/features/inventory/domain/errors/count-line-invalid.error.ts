import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class CountLineInvalidError extends DomainError {
  readonly code = "COUNT_LINE_INVALID";

  constructor(detail: string) {
    super(`Invalid count line: ${detail}`);
  }
}
