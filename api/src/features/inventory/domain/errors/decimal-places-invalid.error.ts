import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class DecimalPlacesInvalidError extends DomainError {
  readonly code = "DECIMAL_PLACES_INVALID";

  constructor(value: number) {
    super(`Decimal places must be an integer between 0 and 4: ${value}`);
  }
}
