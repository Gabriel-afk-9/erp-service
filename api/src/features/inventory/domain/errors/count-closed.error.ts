import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class CountClosedError extends DomainError {
  readonly code = "COUNT_CLOSED";

  constructor(countId: string) {
    super(`Stock count is already closed: ${countId}`);
  }
}
