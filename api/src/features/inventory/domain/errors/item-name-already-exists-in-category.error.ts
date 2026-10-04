import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ItemNameAlreadyExistsInCategoryError extends DomainError {
  readonly code = "ITEM_NAME_ALREADY_EXISTS_IN_CATEGORY";

  constructor(name: string) {
    super(`Item name already exists in category: ${name}`);
  }
}
