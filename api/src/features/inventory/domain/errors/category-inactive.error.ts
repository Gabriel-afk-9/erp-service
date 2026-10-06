import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class CategoryInactiveError extends DomainError {
  readonly code = "CATEGORY_INACTIVE";

  constructor(categoryId: string) {
    super(`Category is inactive: ${categoryId}`);
  }
}
