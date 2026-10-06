import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class DuplicateOpeningBalanceError extends DomainError {
  readonly code = "DUPLICATE_OPENING_BALANCE";

  constructor(itemId: string) {
    super(`Opening balance already exists for item: ${itemId}`);
  }
}
