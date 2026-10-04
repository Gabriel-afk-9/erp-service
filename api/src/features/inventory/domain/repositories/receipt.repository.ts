import type { ReceiptLine } from "../entities/receipt-line.entity.js";
import type { StockLot } from "../entities/stock-lot.entity.js";
import type { StockMovement } from "../entities/stock-movement.entity.js";
import type { StockReceipt } from "../entities/stock-receipt.entity.js";

export interface ReceiptFilters {
  from?: string;
  to?: string;
  originType?: string;
}

export interface ReceiptRepository {
  saveFull(receipt: StockReceipt, lines: ReceiptLine[], lots: StockLot[], movements: StockMovement[]): Promise<void>;
  findById(id: string): Promise<StockReceipt | null>;
  findByOperationKey(operationKey: string): Promise<StockReceipt | null>;
  findLinesByReceiptId(receiptId: string): Promise<ReceiptLine[]>;
  list(filters: ReceiptFilters): Promise<StockReceipt[]>;
}
