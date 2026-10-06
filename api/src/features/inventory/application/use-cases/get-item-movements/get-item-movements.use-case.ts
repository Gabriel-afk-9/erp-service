import { ItemNotFoundError } from "../../../domain/errors/item-not-found.error.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { MovementRepository } from "../../../domain/repositories/movement.repository.js";
import type { GetItemMovementsInput } from "./get-item-movements.input.js";
import type { GetItemMovementsOutput } from "./get-item-movements.output.js";

export class GetItemMovementsUseCase {
  constructor(
    private readonly items: ItemRepository,
    private readonly movements: MovementRepository,
  ) {}

  async execute(input: GetItemMovementsInput): Promise<GetItemMovementsOutput> {
    const item = await this.items.findById(input.itemId);
    if (item === null) {
      throw new ItemNotFoundError(input.itemId);
    }
    const movements = await this.movements.listByItem(item.id, input.to);
    let running = 0;
    return {
      itemId: item.id,
      movements: movements.map((movement) => {
        running += movement.balanceDelta;
        return {
          movementId: movement.id,
          type: movement.type,
          quantity: movement.quantity,
          balanceDelta: movement.balanceDelta,
          balanceAfter: running,
          occurredAt: movement.occurredAt,
          lotId: movement.lotId,
        };
      }),
    };
  }
}
