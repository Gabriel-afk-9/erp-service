import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { ItemNotFoundError } from "../../../domain/errors/item-not-found.error.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { LotRepository } from "../../../domain/repositories/lot.repository.js";
import type { MovementRepository } from "../../../domain/repositories/movement.repository.js";
import { BalanceCalculator } from "../../services/balance-calculator.js";
import type { GetItemBalanceInput } from "./get-item-balance.input.js";
import type { GetItemBalanceOutput } from "./get-item-balance.output.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class GetItemBalanceUseCase {
  constructor(
    private readonly items: ItemRepository,
    private readonly lots: LotRepository,
    private readonly movements: MovementRepository,
  ) {}

  async execute(input: GetItemBalanceInput): Promise<GetItemBalanceOutput> {
    const item = await this.items.findById(input.itemId);
    if (item === null) {
      throw new ItemNotFoundError(input.itemId);
    }
    const referenceDate = input.referenceDate ?? today();
    CivilDate.from(referenceDate);
    const calculator = new BalanceCalculator(this.lots, this.movements);
    const balance = await calculator.forItem(item.id, referenceDate);
    return { itemId: item.id, onHand: balance.onHand, available: balance.available, lots: balance.lots };
  }
}
