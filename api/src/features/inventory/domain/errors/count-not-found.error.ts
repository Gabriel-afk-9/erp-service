import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class CountNotFoundError extends DomainError {
  readonly code = "COUNT_NOT_FOUND";

  constructor(countId: string) {
    super(`Stock count not found: ${countId}`);
  }
}
