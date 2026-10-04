import type { ReceiptRepository } from "../../../domain/repositories/receipt.repository.js";
import type { ListReceiptsInput } from "./list-receipts.input.js";
import type { ListReceiptsOutput } from "./list-receipts.output.js";

export class ListReceiptsUseCase {
  constructor(private readonly receipts: ReceiptRepository) {}

  async execute(input: ListReceiptsInput): Promise<ListReceiptsOutput> {
    const receipts = await this.receipts.list(input);
    return {
      receipts: receipts.map((receipt) => ({
        receiptId: receipt.id,
        originType: receipt.originType,
        donorName: receipt.donorName,
        receivedAt: receipt.receivedAt,
      })),
    };
  }
}
