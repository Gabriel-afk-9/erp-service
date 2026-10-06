import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { StockLot } from "../../../domain/entities/stock-lot.entity.js";
import { StockMovement } from "../../../domain/entities/stock-movement.entity.js";
import { CountClosedError } from "../../../domain/errors/count-closed.error.js";
import { CountNotFoundError } from "../../../domain/errors/count-not-found.error.js";
import { ItemNotFoundError } from "../../../domain/errors/item-not-found.error.js";
import { LotExpirationRequiredError } from "../../../domain/errors/lot-expiration-required.error.js";
import type { CountRepository } from "../../../domain/repositories/count.repository.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { LotRepository } from "../../../domain/repositories/lot.repository.js";
import type { MovementRepository } from "../../../domain/repositories/movement.repository.js";
import type { CloseCountInput } from "./close-count.input.js";
import type { CloseCountOutput } from "./close-count.output.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class CloseStockCountUseCase {
  constructor(
    private readonly counts: CountRepository,
    private readonly lots: LotRepository,
    private readonly movements: MovementRepository,
    private readonly items: ItemRepository,
  ) {}

  async execute(input: CloseCountInput): Promise<CloseCountOutput> {
    const count = await this.counts.findCountById(input.countId);
    if (count === null) {
      throw new CountNotFoundError(input.countId);
    }
    if (count.status !== "OPEN") {
      throw new CountClosedError(count.id);
    }
    const closedAt = CivilDate.from(input.closedAt ?? today());
    const lines = await this.counts.findLinesByCountId(count.id);
    let adjustments = 0;
    for (const line of lines) {
      const variance = line.variance;
      if (variance === 0) continue;
      const item = await this.items.findById(line.itemId);
      if (item === null) {
        throw new ItemNotFoundError(line.itemId);
      }
      let lotId = line.lotId;
      if (lotId === null) {
        if (variance < 0) continue;
        if (item.requiresExpiration && (line.expiresOn ?? null) === null) {
          throw new LotExpirationRequiredError(item.id);
        }
        const lot = StockLot.create({
          itemId: item.id,
          unitId: line.unitId,
          countLineId: line.id,
          expiresOn: line.expiresOn,
        });
        await this.lots.save(lot);
        lotId = lot.id;
      }
      const hasOpening = await this.movements.hasOpeningBalance(item.id);
      const type = variance > 0 ? (hasOpening ? "ADJUSTMENT_IN" : "OPENING_BALANCE") : "ADJUSTMENT_OUT";
      await this.movements.append(
        StockMovement.create({
          itemId: item.id,
          unitId: line.unitId,
          lotId,
          countLineId: line.id,
          type,
          quantity: Math.abs(variance),
          occurredAt: closedAt,
          recordedBy: input.actorId,
          reason: `Contagem ${count.id}`,
        }),
      );
      adjustments += 1;
    }
    count.close(closedAt);
    await this.counts.saveCount(count);
    return { countId: count.id, adjustments };
  }
}
