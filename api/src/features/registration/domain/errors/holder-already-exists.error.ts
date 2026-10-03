import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class HolderAlreadyExistsError extends DomainError {
  readonly code = "HOLDER_ALREADY_EXISTS";

  constructor(familyId: string) {
    super(`Family already has an active holder: ${familyId}`);
  }
}
