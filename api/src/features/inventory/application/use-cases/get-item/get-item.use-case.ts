import { CategoryNotFoundError } from "../../../domain/errors/category-not-found.error.js";
import { ItemNotFoundError } from "../../../domain/errors/item-not-found.error.js";
import { UnitNotFoundError } from "../../../domain/errors/unit-not-found.error.js";
import type { CategoryRepository } from "../../../domain/repositories/category.repository.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { UnitRepository } from "../../../domain/repositories/unit.repository.js";
import type { GetItemInput } from "./get-item.input.js";
import type { GetItemOutput } from "./get-item.output.js";

export class GetItemUseCase {
  constructor(
    private readonly items: ItemRepository,
    private readonly categories: CategoryRepository,
    private readonly units: UnitRepository,
  ) {}

  async execute(input: GetItemInput): Promise<GetItemOutput> {
    const item = await this.items.findById(input.itemId);
    if (item === null) {
      throw new ItemNotFoundError(input.itemId);
    }
    const category = await this.categories.findById(item.categoryId);
    if (category === null) {
      throw new CategoryNotFoundError(item.categoryId);
    }
    const unit = await this.units.findById(item.unitId);
    if (unit === null) {
      throw new UnitNotFoundError(item.unitId);
    }
    return {
      itemId: item.id,
      name: item.name,
      description: item.description,
      requiresExpiration: item.requiresExpiration,
      isActive: item.isActive,
      revision: item.revision,
      category: { categoryId: category.id, name: category.name },
      unit: {
        unitId: unit.id,
        symbol: unit.symbol,
        name: unit.name,
        decimalPlaces: unit.decimalPlaces,
        quantityIncrement: unit.quantityIncrement,
      },
    };
  }
}

