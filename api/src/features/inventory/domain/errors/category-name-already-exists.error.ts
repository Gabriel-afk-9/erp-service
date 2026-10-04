import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class CategoryNameAlreadyExistsError extends DomainError {
  readonly code = "CATEGORY_NAME_ALREADY_EXISTS";

  constructor(name: string) {
    super(`Category name already exists: ${name}`);
  }
}
