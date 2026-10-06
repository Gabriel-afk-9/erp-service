import { BazarTransferNotFoundError } from "../../../domain/errors/bazar-transfer-not-found.error.js";
import { ItemNotFoundError } from "../../../domain/errors/item-not-found.error.js";
import { ReceiptNotFoundError } from "../../../domain/errors/receipt-not-found.error.js";
import type { BazarTransferRepository } from "../../../domain/repositories/bazar-transfer.repository.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { LotRepository } from "../../../domain/repositories/lot.repository.js";
import type { ReceiptRepository } from "../../../domain/repositories/receipt.repository.js";
import type { GetBazarTransferInput } from "./get-bazar-transfer.input.js";
import type { GetBazarTransferOutput } from "./get-bazar-transfer.output.js";

export class GetBazarTransferUseCase {
  constructor(
    private readonly transfers: BazarTransferRepository,
    private readonly receipts: ReceiptRepository,
    private readonly items: ItemRepository,
    private readonly lots: LotRepository,
  ) {}

  async execute(input: GetBazarTransferInput): Promise<GetBazarTransferOutput> {
    const transfer = await this.transfers.findById(input.transferId);
    if (transfer === null) {
      throw new BazarTransferNotFoundError(input.transferId);
    }
    const receipt = await this.receipts.findById(transfer.receiptId);
    if (receipt === null) {
      throw new ReceiptNotFoundError(transfer.receiptId);
    }
    const lines = await this.receipts.findLinesByReceiptId(receipt.id);
    const enriched = await Promise.all(
      lines.map(async (line) => {
        const item = await this.items.findById(line.itemId);
        if (item === null) {
          throw new ItemNotFoundError(line.itemId);
        }
        const lot = await this.lots.findByReceiptLineId(line.id);
        return {
          lineId: line.id,
          itemId: line.itemId,
          itemName: item.name,
          informedQuantity: line.informedQuantity,
          receivedQuantity: line.receivedQuantity,
          acceptedQuantity: line.acceptedQuantity,
          rejectedQuantity: line.rejectedQuantity,
          divergence: line.informedQuantity === null ? null : line.receivedQuantity - line.informedQuantity,
          lotId: lot?.id ?? null,
        };
      }),
    );
    return {
      transferId: transfer.id,
      externalReference: transfer.externalReference,
      receiptId: receipt.id,
      receivedAt: receipt.receivedAt,
      donorName: receipt.donorName,
      lines: enriched,
    };
  }
}
