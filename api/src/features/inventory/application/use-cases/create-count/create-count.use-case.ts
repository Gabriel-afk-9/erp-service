import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { StockCount, StockCountLine } from "../../../domain/entities/stock-count.entity.js";
import type { CountRepository } from "../../../domain/repositories/count.repository.js";
import type { LotRepository } from "../../../domain/repositories/lot.repository.js";
import type { MovementRepository } from "../../../domain/repositories/movement.repository.js";
import type { CreateCountInput } from "./create-count.input.js";
import type { CreateCountOutput } from "./create-count.output.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class CreateStockCountUseCase {
  constructor(
    private readonly counts: CountRepository,
    private readonly lots: LotRepository,
    private readonly movements: MovementRepository,
  ) {}

  async execute(input: CreateCountInput): Promise<CreateCountOutput> {
    const conductedAt = CivilDate.from(input.conductedAt ?? today());
    const count = StockCount.create({ conductedBy: input.actorId, conductedAt, note: input.note ?? null });
    await this.counts.saveCount(count);
    // Freeze expected quantities per lot at opening; concurrent movements after
    // this point do not change what the counter compares against.
    const lots = await this.lots.listAll();
    let lineCount = 0;
    for (const lot of lots) {
      const onHand = await this.movements.sumDeltaByLot(lot.id);
      if (onHand === 0) continue;
      await this.counts.saveLine(
        StockCountLine.create({
          countId: count.id,
          itemId: lot.itemId,
          unitId: lot.unitId,
          lotId: lot.id,
          expiresOn: lot.expiresOn,
          expectedQuantity: onHand,
          countedQuantity: onHand,
        }),
      );
      lineCount += 1;
    }
    return { countId: count.id, lineCount };
  }
}
