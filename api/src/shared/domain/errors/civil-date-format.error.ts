import { DomainError } from "./domain.error.js";

export class CivilDateFormatError extends DomainError {
  readonly code = "CIVIL_DATE_FORMAT_INVALID";

  constructor(raw: string) {
    super(`Invalid civil date, expected YYYY-MM-DD: ${raw}`);
  }
}
