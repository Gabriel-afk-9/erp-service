import type { BazarTransfer } from "../entities/bazar-transfer.entity.js";
import type { ReceiptLine } from "../entities/receipt-line.entity.js";
import type { StockLot } from "../entities/stock-lot.entity.js";
import type { StockMovement } from "../entities/stock-movement.entity.js";
import type { StockReceipt } from "../entities/stock-receipt.entity.js";

export interface BazarTransferFilters {
  from?: string;
  to?: string;
}

export interface BazarTransferRepository {
  saveFull(transfer: BazarTransfer, receipt: StockReceipt, lines: ReceiptLine[], lots: StockLot[], movements: StockMovement[]): Promise<void>;
  findById(id: string): Promise<BazarTransfer | null>;
  findByExternalReference(externalReference: string): Promise<BazarTransfer | null>;
  findReceiptByTransferId(transferId: string): Promise<StockReceipt | null>;
  list(filters: BazarTransferFilters): Promise<BazarTransfer[]>;
}
