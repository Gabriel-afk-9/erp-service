import { CategoryNotFoundError } from "../../../domain/errors/category-not-found.error.js";
import type { CategoryRepository } from "../../../domain/repositories/category.repository.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { UnitRepository } from "../../../domain/repositories/unit.repository.js";
import type { GetCategoryInput } from "./get-category.input.js";
import type { GetCategoryOutput } from "./get-category.output.js";

export class GetCategoryUseCase {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly items: ItemRepository,
    private readonly units: UnitRepository,
  ) {}

  async execute(input: GetCategoryInput): Promise<GetCategoryOutput> {
    const category = await this.categories.findById(input.categoryId);
    if (category === null) {
      throw new CategoryNotFoundError(input.categoryId);
    }
    const items = await this.items.findByQuery("", { categoryId: category.id });
    const withUnits = await Promise.all(
      items.map(async (item) => {
        const unit = await this.units.findById(item.unitId);
        return {
          itemId: item.id,
          name: item.name,
          unitSymbol: unit?.symbol ?? "",
          requiresExpiration: item.requiresExpiration,
          isActive: item.isActive,
        };
      }),
    );
    return {
      categoryId: category.id,
      name: category.name,
      description: category.description,
      isActive: category.isActive,
      revision: category.revision,
      items: withUnits,
    };
  }
}

