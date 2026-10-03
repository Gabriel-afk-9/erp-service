import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class FamilyCodeInvalidError extends DomainError {
  readonly code = "FAMILY_CODE_INVALID";

  constructor(value: string) {
    super(`Invalid family code format: ${value}`);
  }
}
