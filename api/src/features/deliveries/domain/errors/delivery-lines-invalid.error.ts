import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class DeliveryLinesInvalidError extends DomainError {
  readonly code = "DELIVERY_LINES_INVALID";

  constructor(detail: string) {
    super(`Invalid delivery lines: ${detail}`);
  }
}
