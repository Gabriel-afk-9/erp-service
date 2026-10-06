import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ItemInactiveError extends DomainError {
  readonly code = "ITEM_INACTIVE";

  constructor(itemId: string) {
    super(`Item is inactive: ${itemId}`);
  }
}
