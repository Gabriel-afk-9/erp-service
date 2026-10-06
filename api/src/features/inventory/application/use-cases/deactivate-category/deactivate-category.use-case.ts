import { ConcurrentModificationError } from "../../../../../shared/domain/errors/concurrent-modification.error.js";
import { CategoryNotFoundError } from "../../../domain/errors/category-not-found.error.js";
import type { CategoryRepository } from "../../../domain/repositories/category.repository.js";
import type { DeactivateCategoryInput } from "./deactivate-category.input.js";
import type { DeactivateCategoryOutput } from "./deactivate-category.output.js";

export class DeactivateCategoryUseCase {
  constructor(private readonly repository: CategoryRepository) {}

  async execute(input: DeactivateCategoryInput): Promise<DeactivateCategoryOutput> {
    const category = await this.repository.findById(input.categoryId);
    if (category === null) {
      throw new CategoryNotFoundError(input.categoryId);
    }
    if (category.revision !== input.expectedRevision) {
      throw new ConcurrentModificationError(input.expectedRevision, category.revision);
    }
    // Production should verify active items before deactivating a category.
    category.deactivate();
    await this.repository.save(category);
    return { categoryId: category.id, isActive: false };
  }
}

