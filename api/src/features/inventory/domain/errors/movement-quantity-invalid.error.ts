import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class MovementQuantityInvalidError extends DomainError {
  readonly code = "MOVEMENT_QUANTITY_INVALID";

  constructor(value: number) {
    super(`Movement quantity must be positive, got ${value}`);
  }
}
