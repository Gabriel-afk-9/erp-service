import type { StockLot } from "../entities/stock-lot.entity.js";

export interface LotRepository {
  save(lot: StockLot): Promise<void>;
  findById(id: string): Promise<StockLot | null>;
  findByReceiptLineId(receiptLineId: string): Promise<StockLot | null>;
  findByItem(itemId: string): Promise<StockLot[]>;
  listAll(): Promise<StockLot[]>;
}
