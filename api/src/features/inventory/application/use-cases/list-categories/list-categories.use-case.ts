import type { CategoryRepository } from "../../../domain/repositories/category.repository.js";
import type { ListCategoriesInput } from "./list-categories.input.js";
import type { ListCategoriesOutput } from "./list-categories.output.js";

export class ListCategoriesUseCase {
  constructor(private readonly repository: CategoryRepository) {}

  async execute(input: ListCategoriesInput): Promise<ListCategoriesOutput> {
    const categories = await this.repository.findByQuery(input.q ?? "", input.onlyActive);
    return {
      categories: categories.map((category) => ({
        categoryId: category.id,
        name: category.name,
        description: category.description,
        isActive: category.isActive,
        revision: category.revision,
      })),
    };
  }
}

