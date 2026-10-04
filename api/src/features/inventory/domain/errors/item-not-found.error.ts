import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ItemNotFoundError extends DomainError {
  readonly code = "ITEM_NOT_FOUND";

  constructor(itemId: string) {
    super(`Item not found: ${itemId}`);
  }
}
