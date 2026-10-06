import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { StockMovement } from "../../../domain/entities/stock-movement.entity.js";
import { ItemInactiveError } from "../../../domain/errors/item-inactive.error.js";
import { ItemNotFoundError } from "../../../domain/errors/item-not-found.error.js";
import { NegativeBalanceBlockedError } from "../../../domain/errors/negative-balance-blocked.error.js";
import { ReceiptInvalidError } from "../../../domain/errors/receipt-invalid.error.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { LotRepository } from "../../../domain/repositories/lot.repository.js";
import type { MovementRepository } from "../../../domain/repositories/movement.repository.js";
import type { AdjustStockInput } from "./adjust-stock.input.js";
import type { AdjustStockOutput } from "./adjust-stock.output.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class AdjustStockUseCase {
  constructor(
    private readonly items: ItemRepository,
    private readonly lots: LotRepository,
    private readonly movements: MovementRepository,
  ) {}

  async execute(input: AdjustStockInput): Promise<AdjustStockOutput> {
    const replay = await this.movements.findByOperationKey(input.operationKey);
    if (replay !== null) {
      return { movementId: replay.id, duplicate: true };
    }
    if (input.reason.trim().length < 3) {
      throw new ReceiptInvalidError("adjustment reason must have at least 3 characters");
    }
    const item = await this.items.findById(input.itemId);
    if (item === null) {
      throw new ItemNotFoundError(input.itemId);
    }
    if (!item.isActive) {
      throw new ItemInactiveError(item.id);
    }
    if (input.lotId !== undefined && input.lotId !== null) {
      const lot = await this.lots.findById(input.lotId);
      if (lot === null || lot.itemId !== item.id) {
        throw new ReceiptInvalidError("adjustment lot must belong to the item");
      }
    }
    const occurredAt = CivilDate.from(input.occurredAt ?? today());
    const onHand = await this.movements.sumDeltaByItem(item.id);
    const delta = input.direction === "IN" ? input.quantity : -input.quantity;
    if (onHand + delta < 0) {
      throw new NegativeBalanceBlockedError(item.id, onHand, input.quantity);
    }
    const movement = StockMovement.create({
      itemId: item.id,
      unitId: item.unitId,
      lotId: input.lotId ?? null,
      type: input.direction === "IN" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
      quantity: input.quantity,
      occurredAt,
      recordedBy: input.actorId,
      reason: input.reason,
      operationKey: input.operationKey,
    });
    await this.movements.append(movement);
    return { movementId: movement.id, duplicate: false };
  }
}
