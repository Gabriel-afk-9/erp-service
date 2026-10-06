import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class NegativeBalanceBlockedError extends DomainError {
  readonly code = "NEGATIVE_BALANCE_BLOCKED";

  constructor(itemId: string, onHand: number, requested: number) {
    super(`Adjustment of ${requested} would make item ${itemId} negative (on hand: ${onHand})`);
  }
}
