import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class UnitNotFoundError extends DomainError {
  readonly code = "UNIT_NOT_FOUND";

  constructor(unitId: string) {
    super(`Unit not found: ${unitId}`);
  }
}
