import type { CategoryRepository } from "../../../domain/repositories/category.repository.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { LotRepository } from "../../../domain/repositories/lot.repository.js";
import type { MovementRepository } from "../../../domain/repositories/movement.repository.js";
import type { UnitRepository } from "../../../domain/repositories/unit.repository.js";
import { BalanceCalculator } from "../../services/balance-calculator.js";
import type { ListItemsWithBalanceInput } from "./list-items-with-balance.input.js";
import type { ListItemsWithBalanceOutput } from "./list-items-with-balance.output.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class ListItemsWithBalanceUseCase {
  constructor(
    private readonly items: ItemRepository,
    private readonly categories: CategoryRepository,
    private readonly units: UnitRepository,
    private readonly lots: LotRepository,
    private readonly movements: MovementRepository,
  ) {}

  async execute(input: ListItemsWithBalanceInput): Promise<ListItemsWithBalanceOutput> {
    const referenceDate = input.referenceDate ?? today();
    const items = await this.items.findByQuery(input.q ?? "", {
      categoryId: input.categoryId,
      onlyActive: input.onlyActive,
    });
    const calculator = new BalanceCalculator(this.lots, this.movements);
    const enriched = await Promise.all(
      items.map(async (item) => {
        const [category, unit, balance] = await Promise.all([
          this.categories.findById(item.categoryId),
          this.units.findById(item.unitId),
          calculator.forItem(item.id, referenceDate),
        ]);
        return {
          itemId: item.id,
          name: item.name,
          categoryName: category?.name ?? "",
          unitSymbol: unit?.symbol ?? "",
          requiresExpiration: item.requiresExpiration,
          isActive: item.isActive,
          onHand: balance.onHand,
          available: balance.available,
        };
      }),
    );
    return { items: enriched };
  }
}
