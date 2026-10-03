import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class FamilyCodeAlreadyExistsError extends DomainError {
  readonly code = "FAMILY_CODE_ALREADY_EXISTS";

  constructor(code: string) {
    super(`Family code already exists: ${code}`);
  }
}
