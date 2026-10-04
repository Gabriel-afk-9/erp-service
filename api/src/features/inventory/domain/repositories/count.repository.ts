import type { StockCount, StockCountLine } from "../entities/stock-count.entity.js";

export interface CountRepository {
  saveCount(count: StockCount): Promise<void>;
  saveLine(line: StockCountLine): Promise<void>;
  updateLine(line: StockCountLine): Promise<void>;
  findCountById(id: string): Promise<StockCount | null>;
  findLinesByCountId(countId: string): Promise<StockCountLine[]>;
  findLineByLot(countId: string, lotId: string): Promise<StockCountLine | null>;
}
