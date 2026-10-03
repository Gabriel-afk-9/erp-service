import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class PostalCodeInvalidError extends DomainError {
  readonly code = "POSTAL_CODE_INVALID";

  constructor(value: string) {
    super(`Invalid postal code: expected 8 digits, received ${value}`);
  }
}
