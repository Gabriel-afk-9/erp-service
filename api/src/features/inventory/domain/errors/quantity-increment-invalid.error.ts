import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class QuantityIncrementInvalidError extends DomainError {
  readonly code = "QUANTITY_INCREMENT_INVALID";

  constructor(value: number) {
    super(`Quantity increment must be greater than zero: ${value}`);
  }
}
