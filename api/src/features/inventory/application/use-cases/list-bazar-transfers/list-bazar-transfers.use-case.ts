import type { BazarTransferRepository } from "../../../domain/repositories/bazar-transfer.repository.js";
import type { ListBazarTransfersInput } from "./list-bazar-transfers.input.js";
import type { ListBazarTransfersOutput } from "./list-bazar-transfers.output.js";

export class ListBazarTransfersUseCase {
  constructor(private readonly transfers: BazarTransferRepository) {}

  async execute(input: ListBazarTransfersInput): Promise<ListBazarTransfersOutput> {
    const transfers = await this.transfers.list(input);
    return {
      transfers: transfers.map((transfer) => ({
        transferId: transfer.id,
        externalReference: transfer.externalReference,
        receiptId: transfer.receiptId,
      })),
    };
  }
}
