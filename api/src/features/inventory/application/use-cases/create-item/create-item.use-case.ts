import { Item } from "../../../domain/entities/item.entity.js";
import { CategoryInactiveError } from "../../../domain/errors/category-inactive.error.js";
import { CategoryNotFoundError } from "../../../domain/errors/category-not-found.error.js";
import { ItemNameAlreadyExistsInCategoryError } from "../../../domain/errors/item-name-already-exists-in-category.error.js";
import { UnitNotFoundError } from "../../../domain/errors/unit-not-found.error.js";
import type { CategoryRepository } from "../../../domain/repositories/category.repository.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { UnitRepository } from "../../../domain/repositories/unit.repository.js";
import type { CreateItemInput } from "./create-item.input.js";
import type { CreateItemOutput } from "./create-item.output.js";

export class CreateItemUseCase {
  constructor(
    private readonly items: ItemRepository,
    private readonly categories: CategoryRepository,
    private readonly units: UnitRepository,
  ) {}

  async execute(input: CreateItemInput): Promise<CreateItemOutput> {
    const category = await this.categories.findById(input.categoryId);
    if (category === null) {
      throw new CategoryNotFoundError(input.categoryId);
    }
    if (!category.isActive) {
      throw new CategoryInactiveError(input.categoryId);
    }
    const unit = await this.units.findById(input.unitId);
    if (unit === null) {
      throw new UnitNotFoundError(input.unitId);
    }
    const existing = await this.items.findByCategoryAndName(input.categoryId, input.name.trim());
    if (existing !== null) {
      throw new ItemNameAlreadyExistsInCategoryError(input.name.trim());
    }
    const item = Item.create({
      categoryId: input.categoryId,
      unitId: input.unitId,
      name: input.name,
      description: input.description ?? null,
      requiresExpiration: input.requiresExpiration,
    });
    await this.items.save(item);
    return { itemId: item.id, name: item.name, revision: item.revision };
  }
}

