import { ItemNotFoundError } from "../../../domain/errors/item-not-found.error.js";
import { ReceiptNotFoundError } from "../../../domain/errors/receipt-not-found.error.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { LotRepository } from "../../../domain/repositories/lot.repository.js";
import type { ReceiptRepository } from "../../../domain/repositories/receipt.repository.js";
import type { UnitRepository } from "../../../domain/repositories/unit.repository.js";
import type { GetReceiptInput } from "./get-receipt.input.js";
import type { GetReceiptOutput } from "./get-receipt.output.js";

export class GetReceiptUseCase {
  constructor(
    private readonly receipts: ReceiptRepository,
    private readonly items: ItemRepository,
    private readonly units: UnitRepository,
    private readonly lots: LotRepository,
  ) {}

  async execute(input: GetReceiptInput): Promise<GetReceiptOutput> {
    const receipt = await this.receipts.findById(input.receiptId);
    if (receipt === null) {
      throw new ReceiptNotFoundError(input.receiptId);
    }
    const lines = await this.receipts.findLinesByReceiptId(receipt.id);
    const enriched = await Promise.all(
      lines.map(async (line) => {
        const item = await this.items.findById(line.itemId);
        if (item === null) {
          throw new ItemNotFoundError(line.itemId);
        }
        const unit = await this.units.findById(line.unitId);
        const lot = await this.lots.findByReceiptLineId(line.id);
        return {
          lineId: line.id,
          itemId: line.itemId,
          itemName: item.name,
          unitSymbol: unit?.symbol ?? "",
          informedQuantity: line.informedQuantity,
          receivedQuantity: line.receivedQuantity,
          acceptedQuantity: line.acceptedQuantity,
          rejectedQuantity: line.rejectedQuantity,
          rejectionReason: line.rejectionReason,
          expiresOn: line.expiresOn,
          lotId: lot?.id ?? null,
        };
      }),
    );
    return {
      receiptId: receipt.id,
      originType: receipt.originType,
      donorName: receipt.donorName,
      receivedBy: receipt.receivedBy,
      receivedAt: receipt.receivedAt,
      note: receipt.note,
      lines: enriched,
    };
  }
}
