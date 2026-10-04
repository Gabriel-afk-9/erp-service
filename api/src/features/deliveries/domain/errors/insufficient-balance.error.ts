import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class InsufficientBalanceError extends DomainError {
  readonly code = "INSUFFICIENT_BALANCE";

  constructor(itemName: string, available: number, requested: number) {
    super(`Insufficient balance for ${itemName}: available ${available}, requested ${requested}`);
  }
}
