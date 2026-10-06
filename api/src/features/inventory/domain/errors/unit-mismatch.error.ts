import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class UnitMismatchError extends DomainError {
  readonly code = "UNIT_MISMATCH";

  constructor(itemId: string, expectedUnitId: string, receivedUnitId: string) {
    super(`Unit ${receivedUnitId} does not match item ${itemId} unit ${expectedUnitId}; conversion is not supported`);
  }
}
