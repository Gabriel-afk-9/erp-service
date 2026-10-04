import { Category } from "../../../domain/entities/category.entity.js";
import { CategoryNameAlreadyExistsError } from "../../../domain/errors/category-name-already-exists.error.js";
import type { CategoryRepository } from "../../../domain/repositories/category.repository.js";
import type { CreateCategoryInput } from "./create-category.input.js";
import type { CreateCategoryOutput } from "./create-category.output.js";

export class CreateCategoryUseCase {
  constructor(private readonly repository: CategoryRepository) {}

  async execute(input: CreateCategoryInput): Promise<CreateCategoryOutput> {
    const existing = await this.repository.findByName(input.name.trim());
    if (existing !== null) {
      throw new CategoryNameAlreadyExistsError(input.name.trim());
    }
    const category = Category.create({ name: input.name, description: input.description ?? null });
    await this.repository.save(category);
    return { categoryId: category.id, name: category.name, revision: category.revision };
  }
}

