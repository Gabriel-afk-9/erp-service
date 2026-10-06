import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class LotExpirationRequiredError extends DomainError {
  readonly code = "LOT_EXPIRATION_REQUIRED";

  constructor(itemId: string) {
    super(`Expiration date is required for perishable item: ${itemId}`);
  }
}
