import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class CategoryNotFoundError extends DomainError {
  readonly code = "CATEGORY_NOT_FOUND";

  constructor(categoryId: string) {
    super(`Category not found: ${categoryId}`);
  }
}
