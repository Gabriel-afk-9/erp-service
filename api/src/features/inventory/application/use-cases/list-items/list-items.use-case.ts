import type { CategoryRepository } from "../../../domain/repositories/category.repository.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { UnitRepository } from "../../../domain/repositories/unit.repository.js";
import type { ListItemsInput } from "./list-items.input.js";
import type { ListItemsOutput } from "./list-items.output.js";

export class ListItemsUseCase {
  constructor(
    private readonly items: ItemRepository,
    private readonly categories: CategoryRepository,
    private readonly units: UnitRepository,
  ) {}

  async execute(input: ListItemsInput): Promise<ListItemsOutput> {
    const items = await this.items.findByQuery(input.q ?? "", {
      categoryId: input.categoryId,
      onlyActive: input.onlyActive,
    });
    const enriched = await Promise.all(
      items.map(async (item) => {
        const [category, unit] = await Promise.all([
          this.categories.findById(item.categoryId),
          this.units.findById(item.unitId),
        ]);
        return {
          itemId: item.id,
          name: item.name,
          description: item.description,
          categoryId: item.categoryId,
          categoryName: category?.name ?? "",
          unitId: item.unitId,
          unitSymbol: unit?.symbol ?? "",
          requiresExpiration: item.requiresExpiration,
          isActive: item.isActive,
          revision: item.revision,
        };
      }),
    );
    return { items: enriched };
  }
}

