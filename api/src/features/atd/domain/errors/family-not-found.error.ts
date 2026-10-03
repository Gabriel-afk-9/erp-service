import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class FamilyNotFoundError extends DomainError {
  readonly code = "FAMILY_NOT_FOUND";

  constructor(familyId: string) {
    super(`Family not found: ${familyId}`);
  }
}
