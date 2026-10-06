import { ConcurrentModificationError } from "../../../../../shared/domain/errors/concurrent-modification.error.js";
import { CategoryNameAlreadyExistsError } from "../../../domain/errors/category-name-already-exists.error.js";
import { CategoryNotFoundError } from "../../../domain/errors/category-not-found.error.js";
import type { CategoryRepository } from "../../../domain/repositories/category.repository.js";
import type { UpdateCategoryInput } from "./update-category.input.js";
import type { UpdateCategoryOutput } from "./update-category.output.js";

export class UpdateCategoryUseCase {
  constructor(private readonly repository: CategoryRepository) {}

  async execute(input: UpdateCategoryInput): Promise<UpdateCategoryOutput> {
    const category = await this.repository.findById(input.categoryId);
    if (category === null) {
      throw new CategoryNotFoundError(input.categoryId);
    }
    if (category.revision !== input.expectedRevision) {
      throw new ConcurrentModificationError(input.expectedRevision, category.revision);
    }
    if (input.name !== undefined && input.name.trim() !== category.name) {
      const existing = await this.repository.findByName(input.name.trim());
      if (existing !== null && existing.id !== category.id) {
        throw new CategoryNameAlreadyExistsError(input.name.trim());
      }
    }
    category.update({ name: input.name, description: input.description });
    await this.repository.save(category);
    return { categoryId: category.id, revision: category.revision };
  }
}

