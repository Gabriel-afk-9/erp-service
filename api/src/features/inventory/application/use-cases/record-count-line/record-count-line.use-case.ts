import { StockCountLine } from "../../../domain/entities/stock-count.entity.js";
import { CountClosedError } from "../../../domain/errors/count-closed.error.js";
import { CountLineInvalidError } from "../../../domain/errors/count-line-invalid.error.js";
import { CountNotFoundError } from "../../../domain/errors/count-not-found.error.js";
import type { CountRepository } from "../../../domain/repositories/count.repository.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { LotRepository } from "../../../domain/repositories/lot.repository.js";
import type { RecordCountLineInput } from "./record-count-line.input.js";
import type { RecordCountLineOutput } from "./record-count-line.output.js";

export class RecordCountLineUseCase {
  constructor(
    private readonly counts: CountRepository,
    private readonly lots: LotRepository,
    private readonly items: ItemRepository,
  ) {}

  async execute(input: RecordCountLineInput): Promise<RecordCountLineOutput> {
    const count = await this.counts.findCountById(input.countId);
    if (count === null) {
      throw new CountNotFoundError(input.countId);
    }
    if (count.status !== "OPEN") {
      throw new CountClosedError(count.id);
    }
    if (input.lotId !== undefined && input.lotId !== null) {
      const line = await this.counts.findLineByLot(count.id, input.lotId);
      if (line === null) {
        throw new CountLineInvalidError("lot is not part of this count snapshot");
      }
      line.recordCounted(input.countedQuantity);
      await this.counts.updateLine(line);
      return { lineId: line.id, variance: line.variance };
    }
    if (input.itemId === undefined || input.unitId === undefined) {
      throw new CountLineInvalidError("itemId and unitId are required for material without a lot");
    }
    const item = await this.items.findById(input.itemId);
    if (item === null) {
      throw new CountLineInvalidError("item not found");
    }
    const line = StockCountLine.create({
      countId: count.id,
      itemId: input.itemId,
      unitId: input.unitId,
      lotId: null,
      expiresOn: input.expiresOn ?? null,
      expectedQuantity: 0,
      countedQuantity: input.countedQuantity,
    });
    await this.counts.saveLine(line);
    return { lineId: line.id, variance: line.variance };
  }
}
